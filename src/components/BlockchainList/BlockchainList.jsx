import { useNavigate } from 'react-router-dom'
import useStore from '../../appStore'
import './BlockchainList.css'
import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

function BlockchainList() {
  const navigate = useNavigate()
  const blockchainData = useStore((state) => state.blockchainData)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (blockchainData && blockchainData.length > 0) {
      setIsLoading(false)
    }
  }, [blockchainData])

  const getActiveValidatorCount = (validators) => {
    if (!validators) return 0;
    return validators.filter(validator => validator.validationStatus === 'active').length;
  };

  // Sort blockchains by score in descending order and filter out chains with no active validators
  const sortedBlockchains = [...blockchainData]
    .filter(chain => getActiveValidatorCount(chain.validators) > 0)
    .sort((a, b) => b.score - a.score);

  const handleCardClick = (chainName) => {
    navigate(`/blockchain/${chainName.toLowerCase()}`)
  }

  const formatTVL = (value) => {
    return `$${(value / 1000000000).toFixed(1)}B`
  }

  const formatNumber = (num) => {
    return num.toLocaleString()
  }

  const getScoreClass = (score) => {
    if (score >= 80) return 'score score-high'
    if (score >= 50) return 'score score-medium'
    return 'score score-low'
  }

  const formatTps = (tpsData) => {
    if (!tpsData || !tpsData.value) return 'N/A';
    return (
      <div className="tps-container">
        <span className="stat-value">{parseFloat(tpsData.value).toFixed(2)}</span>
      </div>
    );
  };

  return (
    <div className="data-list">
      <h2>Avalanche L1's Data</h2>
      {isLoading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading blockchain data...</p>
        </div>
      ) : (
        <div className="blockchain-cards">
          {sortedBlockchains.map((chain) => (
            <div 
              className="blockchain-card" 
              key={chain.chainId}
              onClick={() => handleCardClick(chain.name)}
              role="button"
              tabIndex={0}
            >
              <div className="card-header">
                <img 
                  src={chain.chainLogoUri} 
                  alt={chain.name} 
                  className="chain-logo"
                />
                <h3>{chain.name}</h3>
                <span className={getScoreClass(chain.score)}>
                  Score: {chain.score}
                </span>
              </div>
              <div className="card-content">
                <div className="stat-item">
                  <span className="stat-label">Active Validators</span>
                  <span className="stat-value">{getActiveValidatorCount(chain.validators)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">TVL</span>
                  <span className="stat-value">{formatTVL(chain.tvl)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Average TPS</span>
                  {formatTps(chain.tps)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BlockchainList;
