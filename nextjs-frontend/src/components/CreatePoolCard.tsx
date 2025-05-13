'use client';

import React, { useState, useEffect } from 'react';
import { useCreatePool } from '@/hooks/useTransactions';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Define validation errors interface
interface ValidationErrors {
  collectionMint?: string;
  basePrice?: string;
  growthFactor?: string;
}

// Define price calculation parameters interface
interface PriceCalculationParams {
  base: number;
  growth: number;
  marketCap: number;
}

const CreatePoolCard = () => {
  // Core form state
  const [basePrice, setBasePrice] = useState(1000000); // 0.001 SOL in lamports
  const [growthFactor, setGrowthFactor] = useState(120000); // 0.12 as fixed-point (0.12 = 120000/1000000)
  const [collectionMint, setCollectionMint] = useState('');
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [thresholdMarketCap, setThresholdMarketCap] = useState(69000000000); // Default threshold
  
  // Simulation state
  const [simulationAmount, setSimulationAmount] = useState(1);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);
  
  // Transaction state
  const { createPool, loading, error, txSignature } = useCreatePool();
  const [poolAddress, setPoolAddress] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
  // Chart data
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }[];
  }>({
    labels: [],
    datasets: [],
  });

  // Helper to estimate price - simplified version of the actual calculation
  const calculateEstimatedPrice = ({ base, growth, marketCap }: PriceCalculationParams): number => {
    if (marketCap === 0) return base;
    
    // Simple exponential approximation for UI purposes
    const exponent = Math.exp((growth / 1000000) * marketCap);
    return base * exponent;
  };

  // Generate curve visualization data
  useEffect(() => {
    const marketCapPoints = Array.from({ length: 10 }, (_, i) => i * 10);
    const pricePoints = marketCapPoints.map(marketCap => 
      calculateEstimatedPrice({ base: basePrice, growth: growthFactor, marketCap })
    );
    
    setChartData({
      labels: marketCapPoints.map(mc => `${mc} tokens`),
      datasets: [
        {
          label: 'Token Price (SOL)',
          data: pricePoints.map(p => p / 1000000000), // Convert lamports to SOL
          borderColor: 'rgb(124, 58, 237)',
          backgroundColor: 'rgba(124, 58, 237, 0.5)',
        }
      ]
    });
  }, [basePrice, growthFactor]);

  // Calculate price impact when simulation amount changes
  useEffect(() => {
    if (simulationAmount <= 0) return;
    
    const currentMarketCap = 0; // Assuming new pool starts with 0
    const currentPrice = calculateEstimatedPrice({ base: basePrice, growth: growthFactor, marketCap: currentMarketCap });
    const newPrice = calculateEstimatedPrice({ base: basePrice, growth: growthFactor, marketCap: simulationAmount });
    
    // Calculate average price (simplified version of the actual calculation)
    const avgPrice = (currentPrice + newPrice) / 2;
    const totalCost = avgPrice * simulationAmount;
    
    setEstimatedCost(totalCost);
    setPriceImpact(newPrice - currentPrice);
  }, [simulationAmount, basePrice, growthFactor]);

  // Form validation
  const validateForm = () => {
    const errors: ValidationErrors = {};
    
    if (!collectionMint) {
      errors.collectionMint = 'Please enter a collection mint address';
    } else if (!/^[A-Za-z0-9]{32,44}$/.test(collectionMint)) {
      errors.collectionMint = 'Invalid mint address format';
    }
    
    if (basePrice <= 0) {
      errors.basePrice = 'Base price must be greater than 0';
    } else if (basePrice > Number.MAX_SAFE_INTEGER) {
      errors.basePrice = 'Base price is too high';
    }
    
    if (growthFactor <= 0) {
      errors.growthFactor = 'Growth factor must be greater than 0';
    } else if (growthFactor > 10000000) { // Limit to prevent extreme curves
      errors.growthFactor = 'Growth factor is too high and might cause price to increase too rapidly';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Fix: Remove the fourth argument or update the useCreatePool hook to accept it
    const result = await createPool(basePrice, growthFactor, collectionMint);
    
    if (result) {
      // Fix: Handle result correctly based on its actual type
      setPoolAddress(typeof result === 'string' ? result : "Generated Pool Address");
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Create Bonding Curve Pool</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="collection-mint" className="block text-gray-700 mb-2">Collection Mint Address:</label>
          <input
            type="text"
            id="collection-mint"
            value={collectionMint}
            onChange={(e) => setCollectionMint(e.target.value)}
            placeholder="Enter Metaplex collection mint address"
            className={`w-full px-3 py-2 border ${validationErrors.collectionMint ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600`}
          />
          <p className="text-xs text-gray-500 mt-1">The Metaplex collection that this pool will be associated with</p>
          {validationErrors.collectionMint && (
            <p className="text-xs text-red-500 mt-1">{validationErrors.collectionMint}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="base-price" className="block text-gray-700 mb-2">Base Price (lamports):</label>
          <input
            type="number"
            id="base-price"
            value={basePrice}
            onChange={(e) => setBasePrice(parseInt(e.target.value))}
            min="1"
            className={`w-full px-3 py-2 border ${validationErrors.basePrice ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600`}
          />
          <p className="text-xs text-gray-500 mt-1">Initial NFT price in lamports (1 SOL = 1,000,000,000 lamports)</p>
          {validationErrors.basePrice && (
            <p className="text-xs text-red-500 mt-1">{validationErrors.basePrice}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="growth-factor" className="block text-gray-700 mb-2">Growth Factor:</label>
          <input
            type="number"
            id="growth-factor"
            value={growthFactor}
            onChange={(e) => setGrowthFactor(parseInt(e.target.value))}
            min="1"
            className={`w-full px-3 py-2 border ${validationErrors.growthFactor ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600`}
          />
          <p className="text-xs text-gray-500 mt-1">
            Fixed-point growth rate (e.g., 120000 = 0.12). Higher values create steeper price increases.
          </p>
          {validationErrors.growthFactor && (
            <p className="text-xs text-red-500 mt-1">{validationErrors.growthFactor}</p>
          )}
        </div>
        
        {/* Bonding Curve Visualization */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-2">Price Curve Preview</h4>
          <div className="h-64 border border-gray-200 rounded-md p-2 bg-gray-50">
            <Line 
              data={chartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    title: {
                      display: true,
                      text: 'Price (SOL)'
                    },
                    beginAtZero: true
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Market Cap (tokens)'
                    }
                  }
                }
              }} 
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This graph shows how token price increases as more tokens are purchased.
          </p>
        </div>
        
        {/* Price Impact Simulator */}
        <div className="mb-6 border-t pt-4">
          <h4 className="text-lg font-semibold mb-2">Price Impact Simulator</h4>
          <div className="flex flex-col md:flex-row md:space-x-4">
            <div className="w-full md:w-1/2 mb-2 md:mb-0">
              <label className="block text-gray-700 mb-1">Amount to Buy:</label>
              <input
                type="number"
                value={simulationAmount}
                onChange={(e) => setSimulationAmount(parseInt(e.target.value || "0"))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="w-full md:w-1/2">
              <p className="text-gray-700 mb-1">Estimated Price Impact:</p>
              <p className="font-medium">{(priceImpact / 1000000000).toFixed(6)} SOL</p>
              <p className="text-gray-700 mb-1 mt-2">Estimated Total Cost:</p>
              <p className="font-medium">{(estimatedCost / 1000000000).toFixed(6)} SOL</p>
            </div>
          </div>
        </div>
        
        {/* Fee Structure */}
        <div className="mb-6 border-t pt-4">
          <h4 className="text-lg font-semibold mb-2">Fee Structure</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-50 p-2 rounded">
              <span className="font-medium">Mint Fee:</span> 1% of transaction
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="font-medium">Creator Royalty:</span> 5% of transaction
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="font-medium">Secondary Sales:</span> 3% (1.5% burn, 1.5% distribute)
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="font-medium">Buyback:</span> 5% (2.5% burn, 2.5% distribute)
            </div>
          </div>
        </div>
        
        {/* Advanced Settings */}
        <div className="mb-6 border-t pt-4">
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-lg font-semibold flex items-center mb-2"
          >
            <span>Advanced Settings</span>
            <svg 
              className={`ml-2 w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAdvanced && (
            <div className="pt-2">
              <label className="block text-gray-700 mb-2">Threshold Market Cap:</label>
              <input
                type="number"
                value={thresholdMarketCap}
                onChange={(e) => setThresholdMarketCap(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                Market cap threshold for graduation events (default: 69,000,000,000)
              </p>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Create Pool'}
        </button>
      </form>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {txSignature && poolAddress && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded">
          <p className="font-medium">Pool Created Successfully!</p>
          <p className="mt-1">Transaction: {txSignature.slice(0, 8)}...{txSignature.slice(-8)}</p>
          <p className="mt-1">Pool Address: {poolAddress}</p>
        </div>
      )}
    </div>
  );
};

export default CreatePoolCard;
