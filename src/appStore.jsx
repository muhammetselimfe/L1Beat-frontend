import { create } from 'zustand'

const calculateScore = (validators, tvl, tps) => {
  // First, strictly validate input and active validators
  if (!Array.isArray(validators)) {
    if (import.meta.env.DEV) console.log('Invalid validators array');
    return 0;
  }

  // Filter for ACTIVE validators (with stake > 0 AND status === 'active')
  const activeValidators = validators.filter(v => {
    const stake = parseFloat(v.amountStaked);
    const isActive = v.validationStatus === 'active';
    return !isNaN(stake) && stake > 0 && isActive;  // Added active status check
  });

  // If no active validators, return 0
  if (activeValidators.length === 0) {
    if (import.meta.env.DEV) console.log('No active validators found');
    return 0;
  }

  let score = 0;

  // Has active validators: +20 points
  score += 20;

  // More than 5 active validators: +20 points
  if (activeValidators.length > 5) {
    score += 20;
  }

  // Exactly 10 active validators: set score to 85
  if (activeValidators.length === 10) {
    score = 85;
  }

  // More than 10 active validators: additional points
  if (activeValidators.length > 10) {
    score = 85 + Math.min((activeValidators.length - 10) / 90 * 15, 15);
  }

  return Math.min(Math.round(score), 100);
};

const useStore = create((set, get) => ({
  // TVL Data
  tvlData: [],
  
  // TPS Data
  tpsData: [],
  
  // Blockchain Data with detailed information
  blockchainData: [],

  // Historical Data
  historicalData: {
    validators: {
      "Dexalot": [
        { date: '2024-03-01', count: 850000 },
        { date: '2024-03-07', count: 874523 }
      ],
      "GUN": [
        { date: '2024-03-01', count: 1700 },
        { date: '2024-03-07', count: 1763 }
      ],
      "Avalanche": [
        { date: '2024-03-01', count: 1200000 },
        { date: '2024-03-07', count: 1250000 }
      ],
      "Ethereum": [
        { date: '2024-03-01', count: 925000 },
        { date: '2024-03-07', count: 945000 }
      ],
      "Solana": [
        { date: '2024-03-01', count: 2000 },
        { date: '2024-03-07', count: 2100 }
      ]
    },
    tps: {
      "Dexalot": [
        { date: '2024-03-01', value: 10.2 },
        { date: '2024-03-07', value: 12.5 }
      ],
      "GUN": [
        { date: '2024-03-01', value: 2500 },
        { date: '2024-03-07', value: 2843 }
      ],
      "Avalanche": [
        { date: '2024-03-01', value: 4200 },
        { date: '2024-03-07', value: 4500 }
      ],
      "Ethereum": [
        { date: '2024-03-01', value: 28 },
        { date: '2024-03-07', value: 30 }
      ],
      "Solana": [
        { date: '2024-03-01', value: 62000 },
        { date: '2024-03-07', value: 65000 }
      ]
    }
  },

  // Network Status

  // Actions
  updateTVLData: (newData) => set({ tvlData: newData }),
  updateTPSData: (newData) => set({ tpsData: newData }),
  updateBlockchainData: (newData) => set({ blockchainData: newData }),
  updateHistoricalData: (newData) => set((state) => ({
    historicalData: { ...state.historicalData, ...newData }
  })),
  updateNetworkStatus: (chainName, status) => set((state) => ({
    networkStatus: {
      ...state.networkStatus,
      [chainName]: { ...state.networkStatus[chainName], ...status }
    }
  })),
  fetchBlockchainData: async () => {
    // Return existing data if already loaded
    if (get().blockchainData.length > 0) {
      return get().blockchainData;
    }

    try {
      set({ isLoading: true });
      const API_URL = import.meta.env.VITE_API_URL;
      if (import.meta.env.DEV) console.log('Fetching from:', `${API_URL}/api/chains`);
      
      // Fetch chain data
      const response = await fetch(`${API_URL}/api/chains`);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('Error response:', text);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Fetch TPS data for each chain
      const chainsWithTps = await Promise.all(
        data.map(async (chain) => {
          try {
            const tpsResponse = await fetch(`${API_URL}/api/chains/${chain.chainId}/tps/latest`);
            const tpsData = await tpsResponse.json();
            
            return {
              ...chain,
              tps: tpsData.success ? tpsData.data : null
            };
          } catch (error) {
            console.error(`Failed to fetch TPS for chain ${chain.chainId}:`, error);
            return chain;
          }
        })
      );
      
      const transformedData = chainsWithTps.map(chain => ({
        chainId: chain.chainId,
        name: chain.chainName,
        validators: chain.validators || [],
        validatorCount: chain.validators?.length || 0,
        tvl: 50000000000,
        score: calculateScore(chain.validators || [], 50000000000, 0),
        networkStats: {
          blockTime: "2s",
          finality: "2s",
          networkUsage: "65%",
          stakeRequirement: "2,000 AVAX",
          uptime: "99.9%"
        },
        economics: {
          marketCap: "500M",
          circulatingSupply: chain.networkToken?.description || "N/A",
          totalSupply: "250M",
          stakingAPR: "8.5%"
        },
        stakeDistribution: [
          { name: "Top 1-10", value: 35, fill: "#8884d8" },
          { name: "Top 11-50", value: 30, fill: "#82ca9d" },
          { name: "Top 51-100", value: 20, fill: "#ffc658" },
          { name: "Others", value: 15, fill: "#ff8042" }
        ],
        description: chain.description,
        explorerUrl: chain.explorerUrl,
        rpcUrl: chain.rpcUrl,
        networkToken: chain.networkToken,
        chainLogoUri: chain.chainLogoUri
      }));

      set({ blockchainData: transformedData, isLoading: false });

      // Fetch network TPS data after blockchain data is loaded
      await get().fetchCombinedTpsData();

      return transformedData;
    } catch (error) {
      console.error('Error fetching blockchain data:', error);
      set({ blockchainData: [], isLoading: false });
      throw error;
    }
  },

  // Replace fetchCombinedTpsData with new simplified version
  fetchCombinedTpsData: async (days = 30) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/api/tps/network/history`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.success) {
        throw new Error('Failed to fetch TPS data');
      }

      const sortedData = responseData.data.sort((a, b) => a.timestamp - b.timestamp);

      if (import.meta.env.DEV) {
        console.log('Network TPS data:', sortedData);
      }

      set({ tpsData: sortedData });
      return sortedData;
    } catch (error) {
      console.error('Error fetching network TPS data:', error);
      set({ tpsData: [] });
      throw error;
    }
  },

  // Add a new fetch function for TVL data
  fetchTVLData: async (days = 7) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/api/tvl/history/?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.success || !Array.isArray(responseData.data)) {
        throw new Error('Invalid data format received from API');
      }

      // Sort data by date
      const sortedData = responseData.data.sort((a, b) => a.date - b.date);
      
      if (import.meta.env.DEV) {
        console.log('TVL data loaded:', sortedData);
      }

      set({ tvlData: sortedData });
      return sortedData;
    } catch (error) {
      console.error('Error fetching TVL data:', error);
      set({ tvlData: [] });
      throw error;
    }
  },
}))

export default useStore
