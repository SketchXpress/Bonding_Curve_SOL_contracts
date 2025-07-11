use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use mpl_token_metadata::accounts::Metadata;

use crate::{
    constants::*,
    errors::ErrorCode,
    state::*,
    utils::*,
    debug_log,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MintNftArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

#[derive(Accounts)]
#[instruction(args: MintNftArgs)]
pub struct MintNft<'info> {
    #[account(mut)]
    pub minter: Signer<'info>,

    #[account(mut)]
    pub bonding_curve_pool: Account<'info, BondingCurvePool>,

    #[account(
        init,
        payer = minter,
        mint::decimals = 0,
        mint::authority = minter,
        mint::freeze_authority = minter,
    )]
    pub nft_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = minter,
        associated_token::mint = nft_mint,
        associated_token::authority = minter,
    )]
    pub minter_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = minter,
        space = 8 + std::mem::size_of::<NftEscrow>(),
        seeds = [b"escrow", nft_mint.key().as_ref()],
        bump
    )]
    pub nft_escrow: Account<'info, NftEscrow>,

    #[account(
        init,
        payer = minter,
        space = 8 + std::mem::size_of::<MinterTracker>(),
        seeds = [b"minter", nft_mint.key().as_ref()],
        bump
    )]
    pub minter_tracker: Account<'info, MinterTracker>,

    /// CHECK: Metadata account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub token_metadata_program: Program<'info, mpl_token_metadata::ID>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn mint_nft(ctx: Context<MintNft>, args: MintNftArgs) -> Result<()> {
    let mut debug_ctx = DebugContext::new("mint_nft");
    debug_log!(debug_ctx, LogLevel::Info, "Starting NFT mint");

    // Step 1: Validate inputs
    validate_mint_inputs(&args, &mut debug_ctx)?;

    // Step 2: Calculate price and validate payment
    let mint_price = calculate_mint_price(&ctx.accounts.bonding_curve_pool, &mut debug_ctx)?;
    validate_payment(&ctx.accounts.minter, mint_price, &mut debug_ctx)?;

    // Step 3: Process payment and fees
    process_mint_payment(&ctx, mint_price, &mut debug_ctx)?;

    // Step 4: Create NFT and metadata
    create_nft_and_metadata(&ctx, &args, &mut debug_ctx)?;

    // Step 5: Initialize escrow
    initialize_nft_escrow(&ctx, mint_price, &mut debug_ctx)?;

    // Step 6: Track original minter
    initialize_minter_tracker(&ctx, &mut debug_ctx)?;

    // Step 7: Update pool state
    update_pool_state(&ctx, mint_price, &mut debug_ctx)?;

    debug_log!(debug_ctx, LogLevel::Info, "NFT mint completed successfully");
    Ok(())
}

// === HELPER FUNCTIONS ===

fn validate_mint_inputs(args: &MintNftArgs, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("input_validation");
    
    if args.name.is_empty() || args.name.len() > 32 {
        debug_log!(debug_ctx, LogLevel::Error, "Invalid name length: {}", args.name.len());
        return Err(ErrorCode::InvalidAmount.into());
    }

    if args.symbol.is_empty() || args.symbol.len() > 10 {
        debug_log!(debug_ctx, LogLevel::Error, "Invalid symbol length: {}", args.symbol.len());
        return Err(ErrorCode::InvalidAmount.into());
    }

    if args.uri.is_empty() || args.uri.len() > 200 {
        debug_log!(debug_ctx, LogLevel::Error, "Invalid URI length: {}", args.uri.len());
        return Err(ErrorCode::InvalidAmount.into());
    }

    debug_log!(debug_ctx, LogLevel::Debug, "Input validation passed");
    Ok(())
}

fn calculate_mint_price(pool: &BondingCurvePool, debug_ctx: &mut DebugContext) -> Result<u64> {
    debug_ctx.step("price_calculation");
    
    if !pool.is_active {
        debug_log!(debug_ctx, LogLevel::Error, "Pool is inactive");
        return Err(ErrorCode::PoolInactive.into());
    }

    if pool.current_supply >= pool.max_supply {
        debug_log!(debug_ctx, LogLevel::Error, "Max supply reached");
        return Err(ErrorCode::MaxSupplyReached.into());
    }

    let price = calculate_bonding_curve_price(
        pool.base_price,
        pool.growth_factor,
        pool.current_supply,
    )?;

    debug_log!(debug_ctx, LogLevel::Debug, "Calculated mint price: {}", price);
    Ok(price)
}

fn validate_payment(minter: &Signer, required_amount: u64, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("payment_validation");
    
    if minter.lamports() < required_amount {
        debug_log!(
            debug_ctx, 
            LogLevel::Error, 
            "Insufficient balance: has {}, needs {}", 
            minter.lamports(), 
            required_amount
        );
        return Err(ErrorCode::InsufficientBalance.into());
    }

    debug_log!(debug_ctx, LogLevel::Debug, "Payment validation passed");
    Ok(())
}

fn process_mint_payment(ctx: &Context<MintNft>, mint_price: u64, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("payment_processing");
    
    // Calculate fees
    let platform_fee = calculate_platform_fee(mint_price)?;
    let escrow_amount = mint_price.checked_sub(platform_fee).ok_or(ErrorCode::MathUnderflow)?;

    debug_log!(
        debug_ctx, 
        LogLevel::Debug, 
        "Payment breakdown - Total: {}, Platform: {}, Escrow: {}", 
        mint_price, 
        platform_fee, 
        escrow_amount
    );

    // Transfer platform fee
    if platform_fee > 0 {
        transfer_lamports(
            &ctx.accounts.minter.to_account_info(),
            &ctx.accounts.bonding_curve_pool.to_account_info(),
            platform_fee,
        )?;
    }

    debug_log!(debug_ctx, LogLevel::Debug, "Payment processing completed");
    Ok(())
}

fn create_nft_and_metadata(ctx: &Context<MintNft>, args: &MintNftArgs, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("nft_creation");
    
    // Mint NFT to minter
    let cpi_accounts = anchor_spl::token::MintTo {
        mint: ctx.accounts.nft_mint.to_account_info(),
        to: ctx.accounts.minter_token_account.to_account_info(),
        authority: ctx.accounts.minter.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_spl::token::mint_to(cpi_ctx, 1)?;

    debug_log!(debug_ctx, LogLevel::Debug, "NFT minted successfully");

    // Create metadata
    create_metadata_account(ctx, args, debug_ctx)?;

    Ok(())
}

fn create_metadata_account(ctx: &Context<MintNft>, args: &MintNftArgs, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("metadata_creation");
    
    let metadata_seeds = &[
        b"metadata",
        mpl_token_metadata::ID.as_ref(),
        ctx.accounts.nft_mint.key().as_ref(),
    ];
    let (metadata_pda, _) = Pubkey::find_program_address(metadata_seeds, &mpl_token_metadata::ID);

    if metadata_pda != ctx.accounts.metadata.key() {
        debug_log!(debug_ctx, LogLevel::Error, "Invalid metadata PDA");
        return Err(ErrorCode::InvalidAccount.into());
    }

    // Create metadata instruction
    let create_metadata_ix = mpl_token_metadata::instructions::CreateMetadataAccountV3 {
        metadata: ctx.accounts.metadata.key(),
        mint: ctx.accounts.nft_mint.key(),
        mint_authority: ctx.accounts.minter.key(),
        payer: ctx.accounts.minter.key(),
        update_authority: (ctx.accounts.minter.key(), true),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    };

    let metadata_data = mpl_token_metadata::types::DataV2 {
        name: args.name.clone(),
        symbol: args.symbol.clone(),
        uri: args.uri.clone(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    // Execute metadata creation
    anchor_lang::solana_program::program::invoke(
        &create_metadata_ix.instruction(mpl_token_metadata::instructions::CreateMetadataAccountV3InstructionArgs {
            data: metadata_data,
            is_mutable: true,
            collection_details: None,
        }),
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.nft_mint.to_account_info(),
            ctx.accounts.minter.to_account_info(),
            ctx.accounts.minter.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;

    debug_log!(debug_ctx, LogLevel::Debug, "Metadata created successfully");
    Ok(())
}

fn initialize_nft_escrow(ctx: &Context<MintNft>, mint_price: u64, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("escrow_initialization");
    
    let platform_fee = calculate_platform_fee(mint_price)?;
    let escrow_amount = mint_price.checked_sub(platform_fee).ok_or(ErrorCode::MathUnderflow)?;

    let escrow = &mut ctx.accounts.nft_escrow;
    escrow.nft_mint = ctx.accounts.nft_mint.key();
    escrow.lamports = escrow_amount;
    escrow.last_price = mint_price;
    escrow.bump = ctx.bumps.nft_escrow;

    debug_log!(debug_ctx, LogLevel::Debug, "NFT escrow initialized with {} lamports", escrow_amount);
    Ok(())
}

fn initialize_minter_tracker(ctx: &Context<MintNft>, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("minter_tracking");
    
    let tracker = &mut ctx.accounts.minter_tracker;
    tracker.nft_mint = ctx.accounts.nft_mint.key();
    tracker.original_minter = ctx.accounts.minter.key();
    tracker.mint_timestamp = Clock::get()?.unix_timestamp;
    tracker.bump = ctx.bumps.minter_tracker;

    debug_log!(debug_ctx, LogLevel::Debug, "Minter tracker initialized");
    Ok(())
}

fn update_pool_state(ctx: &Context<MintNft>, mint_price: u64, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("pool_update");
    
    let pool = &mut ctx.accounts.bonding_curve_pool;
    pool.current_supply = pool.current_supply.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
    
    let platform_fee = calculate_platform_fee(mint_price)?;
    let escrow_amount = mint_price.checked_sub(platform_fee).ok_or(ErrorCode::MathUnderflow)?;
    
    pool.total_escrowed = pool.total_escrowed.checked_add(escrow_amount).ok_or(ErrorCode::MathOverflow)?;

    debug_log!(
        debug_ctx, 
        LogLevel::Debug, 
        "Pool updated - Supply: {}, Total Escrowed: {}", 
        pool.current_supply, 
        pool.total_escrowed
    );
    Ok(())
}

fn calculate_platform_fee(amount: u64) -> Result<u64> {
    amount
        .checked_mul(MINT_FEE_PERCENTAGE as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathUnderflow.into())
}

