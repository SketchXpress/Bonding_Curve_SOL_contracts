
'use client'; import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chart, registerables, TooltipItem } from 'chart.js'; // Import TooltipItem
import 'chartjs-adapter-date-fns';
import { useAnchorContext, AnchorContextState } from "@/contexts/AnchorContextProvider"; // Import anchor context and state type
import { PublicKey, AccountInfo, Context } from "@solana/web3.js"; // Import missing types
import { useConnection } from "@solana/wallet-adapter-react"; // Import useConnection
import * as anchor from "@coral-xyz/anchor"; // Import anchor for BN

// Register Chart.js components
Chart.register(...registerables);

interface HistoryPoint {
  timestamp: number;
  supply: number;
  price: string; // Price in lamports as string
}

interface BondingCurveHistoryCardProps {
  poolAddress: string; // Accept pool address as a prop
}

const SOL_DECIMALS = 9;

const BondingCurveHistoryCard: React.FC<BondingCurveHistoryCardProps> = ({ poolAddress }) => {
  const { program } = useAnchorContext() as AnchorContextState; // Get program from Anchor context
  const { connection } = useConnection(); // Get connection directly
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [poolConstants, setPoolConstants] = useState<{ basePrice: bigint; growthFactor: bigint } | null>(null);
  const subscriptionIdRef = useRef<number | null>(null); // To store subscription ID

  // Helper function to calculate price (ensure it uses bigint)
  const calculatePrice = useCallback((supply: bigint): bigint => {
    if (!poolConstants) return 0n;
    const { basePrice, growthFactor } = poolConstants;
    const FIXED_POINT_SCALE = 1_000_000n;
    if (supply < 0n) return 0n;
    if (supply === 0n) {
      return basePrice;
    }
    let price = basePrice;
    for (let i = 0n; i < supply; i++) {
      price = (price * growthFactor) / FIXED_POINT_SCALE;
    }
    return price;
  }, [poolConstants]);

  // Effect for fetching initial history data via API
  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch if poolAddress is empty or invalid
      if (!poolAddress || poolAddress.length < 32) { // Basic validation
        setHistoryData([]);
        setLoading(false);
        // Reset pool constants when address is invalid
        setPoolConstants(null);
        return;
      }

      setLoading(true);
      setError(null);
      // Reset constants on new fetch
      setPoolConstants(null); 

      try {
        // Fetch pool constants first (needed for price calculation)
        if (program && connection) {
          try {
            const poolPublicKey = new PublicKey(poolAddress);
            const poolAccountInfo = await connection.getAccountInfo(poolPublicKey);
            if (!poolAccountInfo) throw new Error("Pool account not found");
            const poolData = program.coder.accounts.decode("BondingCurvePool", poolAccountInfo.data);
            const basePrice = BigInt(poolData.basePrice.toString());
            const growthFactor = BigInt(poolData.growthFactor.toString());
            setPoolConstants({ basePrice, growthFactor });
            console.log("Fetched pool constants:", { basePrice, growthFactor });
          } catch (poolError) {
            console.error("Failed to fetch pool constants:", poolError);
            // Decide if this should be a fatal error for the history card
            // setError("Failed to load pool details needed for price calculation.");
            // return; // Optionally stop if constants are essential before showing history
          }
        }

        // Construct the API endpoint URL
        // Construct the API endpoint URL
        const apiUrl = `/api/history?pool=${encodeURIComponent(poolAddress)}`;
        console.log(`Fetching history from: ${apiUrl}`); // Log the URL being fetched

        // Fetch data from the API endpoint
        const response = await fetch(apiUrl);
        if (!response.ok) {
          // Handle non-2xx responses
          const errorText = await response.text();
          throw new Error(`API error! status: ${response.status} - ${errorText || response.statusText}`);
        }
        const data: HistoryPoint[] = await response.json();

        // Basic validation on response data
        if (!Array.isArray(data)) { // Allow empty array for valid pools with no history yet
            throw new Error("API response is not a valid array.");
        }
        if (data.length > 0 && (typeof data[0].timestamp !== 'number' || typeof data[0].supply !== 'number' || typeof data[0].price !== 'string')) {
            throw new Error("API response data points do not have the expected structure.");
        }

        setHistoryData(data);
      } catch (err) {
        console.error("Failed to fetch history data:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [poolAddress, connection, program]); // Re-run effect when poolAddress, connection or program changes

  // Effect for WebSocket subscription
  useEffect(() => {
    // Ensure we have necessary info and connection supports WebSockets
    if (!poolAddress || !connection || !program || !poolConstants || !connection.onAccountChange) {
      return;
    }

    let poolPublicKey: PublicKey;
    try {
      poolPublicKey = new PublicKey(poolAddress);
    } catch (e) {
      console.error("Invalid pool address for WebSocket subscription:", poolAddress);
      return; // Don't subscribe if address is invalid
    }

    console.log(`Subscribing to account changes for pool: ${poolAddress}`);

    // Subscribe to pool account changes
    const subId = connection.onAccountChange(
      poolPublicKey,
      (accountInfo: AccountInfo<Buffer>, context: Context) => {
        console.log(`Pool account ${poolAddress} changed, slot: ${context.slot}`);
        if (!program || !poolConstants) return; // Need program and constants

        try {
          const poolData = program.coder.accounts.decode("BondingCurvePool", accountInfo.data);
          const newSupply = BigInt(poolData.currentSupply.toString());

          // Get the last known supply from the current history data
          const lastKnownSupply = historyData.length > 0 ? BigInt(historyData[historyData.length - 1].supply) : -1n; // Use -1n if history is empty

          if (newSupply !== lastKnownSupply) {
            console.log(`Supply changed from ${lastKnownSupply} to ${newSupply}`);
            // Calculate the price for the new supply
            const newPrice = calculatePrice(newSupply);
            const newTimestamp = Math.floor(Date.now() / 1000); // Use current time for the update

            const newHistoryPoint: HistoryPoint = {
              timestamp: newTimestamp,
              supply: Number(newSupply), // Convert BigInt to Number for state
              price: newPrice.toString(), // Store price as string
            };

            // Update the history data state
            setHistoryData(prevData => [...prevData, newHistoryPoint]);
            console.log("Appended new history point:", newHistoryPoint);
            // The chart rendering useEffect will handle updating the chart view
          } else {
            console.log("Supply unchanged, ignoring update.");
          }
        } catch (decodeError) {
          console.error("Error decoding updated pool account data:", decodeError);
        }
      },
      "confirmed" // Commitment level
    );

    subscriptionIdRef.current = subId;

    // Cleanup function to unsubscribe when poolAddress changes or component unmounts
    return () => {
      if (subscriptionIdRef.current !== null) {
        console.log(`Unsubscribing from account changes for pool: ${poolAddress}`);
        connection.removeAccountChangeListener(subscriptionIdRef.current)
          .then(() => {
            subscriptionIdRef.current = null;
            console.log(`Unsubscribed successfully from pool: ${poolAddress}`);
          })
          .catch((err: any) => { // Add type annotation for err
            console.error(`Error unsubscribing from pool ${poolAddress}:`, err);
          });
      }
    };
  // Dependencies: Re-subscribe if poolAddress, connection, program, or constants change
  }, [poolAddress, connection, program, poolConstants]);

  // Effect for rendering the chart (remains mostly the same)
  useEffect(() => {
    if (historyData.length > 0 && chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      // Destroy previous chart instance if it exists
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      // Prepare data for Chart.js
      const labels = historyData.map(point => new Date(point.timestamp * 1000));
      const prices = historyData.map(point => parseFloat(point.price) / (10 ** SOL_DECIMALS));
      const supplies = historyData.map(point => point.supply);

      // Create new chart instance
      chartInstanceRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Bonding Curve Price (SOL)',
            data: prices,
            borderColor: 'rgb(167, 139, 250)', // Purple-ish
            backgroundColor: 'rgba(167, 139, 250, 0.2)',
            tension: 0.1,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              title: {
                display: true,
                text: 'Date'
              },
              time: {
                tooltipFormat: 'PPpp',
                unit: 'day' // Adjust based on data range
              },
              ticks: {
                source: 'auto',
                maxRotation: 0,
                autoSkip: true,
              }
            },
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: 'Price (SOL)'
              },
              ticks: {
                 callback: function(value: number | string) {
                    // Dynamically adjust precision based on value range if needed
                    if (typeof value === 'number') return value.toFixed(6);
                    return value;
                 }
              }
            }
          },
          plugins: {
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context: TooltipItem<"line">) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    label += context.parsed.y.toFixed(SOL_DECIMALS) + ' SOL';
                  }
                  return label;
                },
                afterBody: function(context: TooltipItem<"line">[]) {
                  const dataIndex = context[0].dataIndex;
                  if (dataIndex >= 0 && dataIndex < supplies.length) {
                    return `Supply: ${supplies[dataIndex]}`;
                  }
                  return '';
                }
              }
            },
            legend: {
              display: true
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        }
      });
    }

    // Cleanup function to destroy chart on component unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [historyData]); // Re-run effect when historyData changes

  // Effect for WebSocket subscription for real-time updates
  useEffect(() => {
    // Ensure we have necessary info and connection is available
    if (!poolAddress || !connection || !program || !poolConstants || historyData.length === 0) {
      return; // Exit if not ready
    }

    let poolPublicKey: PublicKey;
    try {
      poolPublicKey = new PublicKey(poolAddress);
    } catch (e) {
      console.error("Invalid pool address for WebSocket subscription:", poolAddress);
      return; // Exit if address is invalid
    }

    console.log(`Subscribing to account changes for pool: ${poolAddress}`);

    // Subscribe to pool account changes
    const subscriptionId = connection.onAccountChange(
      poolPublicKey,
      (accountInfo: AccountInfo<Buffer>, context: Context) => {
        console.log("Pool account changed, slot:", context.slot);
        try {
          // Decode the updated pool data
          const poolData = program.coder.accounts.decode("BondingCurvePool", accountInfo.data);
          const newSupply = BigInt(poolData.currentSupply.toString());

          // Get the last known supply from the history data
          const lastHistoryPoint = historyData[historyData.length - 1];
          const lastKnownSupply = BigInt(lastHistoryPoint.supply);

          console.log(`New supply: ${newSupply}, Last known supply: ${lastKnownSupply}`);

          if (newSupply !== lastKnownSupply) {
            // Calculate the price for the new supply
            const newPrice = calculatePrice(newSupply);
            const newTimestamp = Math.floor(Date.now() / 1000); // Use current time for update

            const newPoint: HistoryPoint = {
              timestamp: newTimestamp,
              supply: Number(newSupply), // Convert BigInt to number for state
              price: newPrice.toString(),
            };

            // Update the chart instance directly for smoother updates
            const chart = chartInstanceRef.current;
            // Add checks for chart data properties before pushing
            if (chart && chart.data && chart.data.labels && chart.data.datasets && chart.data.datasets[0] && chart.data.datasets[0].data) {
              chart.data.labels.push(new Date(newPoint.timestamp * 1000));
              chart.data.datasets[0].data.push(parseFloat(newPoint.price) / (10 ** SOL_DECIMALS));
              // Also update the supplies array used by tooltips if needed
              // (Currently, the tooltip logic reads from the initial historyData map, 
              // so we need to update the state anyway for tooltip accuracy)
              chart.update("none"); // Use 'none' for animation mode to avoid jumpiness
              console.log("Chart instance updated.");
            }

            // Update the history data state (still useful for potential re-renders or other logic)
            setHistoryData(prevHistoryData => [...prevHistoryData, newPoint]);
          }
        } catch (decodeError) {
          console.error("Error decoding pool account data:", decodeError);
        }
      },
      "confirmed" // Commitment level
    );

    subscriptionIdRef.current = subscriptionId;
    console.log(`Subscription ID: ${subscriptionId}`);

    // Cleanup function to unsubscribe when component unmounts or dependencies change
    return () => {
      if (subscriptionIdRef.current !== null) {
        console.log(`Unsubscribing from account changes (ID: ${subscriptionIdRef.current})`);
        connection.removeAccountChangeListener(subscriptionIdRef.current)
          .then(() => {
            console.log("Unsubscribed successfully.");
            subscriptionIdRef.current = null;
          })
          .catch((err: any) => { // Add type annotation for err
            console.error("Error unsubscribing:", err);
          });
      } else {
         console.log("No active subscription to remove.");
      }
    };
  // Dependencies: Re-subscribe if connection, program, poolAddress, or constants change.
  // Also include historyData length to ensure subscription starts after initial load.
  }, [connection, program, poolAddress, poolConstants, calculatePrice, historyData.length]); 

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Bonding Curve History</h3>
      <div className="relative h-96"> {/* Set a fixed height for the chart container */} 
        {loading && <p className="text-center text-gray-500">Loading history...</p>}
        {error && <p className="text-center text-red-600">Error loading history: {error}</p>}
        {!loading && !error && historyData.length === 0 && <p className="text-center text-gray-500">No history data available.</p>}
        <canvas ref={chartRef}></canvas>
      </div>
      <p className="text-xs text-gray-500 mt-2">Note: Displaying sample historical data. Replace with real-time data source.</p>
    </div>
  );
};

export default BondingCurveHistoryCard;

