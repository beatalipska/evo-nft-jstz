import { useState, useEffect } from 'react'
import './App.css'

// Use proxy in development to avoid CORS issues
const JSTZ_API_BASE = import.meta.env.DEV ? '/api/jstz' : 'http://127.0.0.1:8933'

interface NFTMetadata {
  name: string
  description: string
  growthLevel: number
  variant: string
  color: string
  image: string
  animation_url?: string
  attributes: Array<{ name: string; value: string }>
  history: {
    owners: string[]
    totalPurchases: number
  }
  milestones: string[]
}

function App() {
  const [contractAddress, setContractAddress] = useState<string>('')
  const [buyerAddress, setBuyerAddress] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata | null>(null)
  const [tokenId, setTokenId] = useState<string>('0')

  const callSmartFunction = async (path: string, method: string = 'GET', body?: any) => {
    if (!contractAddress) {
      throw new Error('Contract address is required')
    }

    const cleanAddress = contractAddress.replace(/^(jstz|tezos):\/\//, '').trim()
    
    try {
      // Ensure path starts with /
      const normalizedPath = path.startsWith('/') ? path : `/${path}`
      const url = `${JSTZ_API_BASE}/run/${cleanAddress}${normalizedPath}`
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      }

      if (method === 'POST' && body) {
        options.body = JSON.stringify(body)
      }

      console.log('Calling:', url, 'Method:', method, 'Body:', body)

      const response = await fetch(url, options)
      console.log('Response status:', response.status, 'OK:', response.ok, 'Headers:', Object.fromEntries(response.headers.entries()))
      
      // Try to get response text first to see what we're getting
      const responseText = await response.text()
      console.log('Response text:', responseText)
      
      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText)
          const errorMsg = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
          console.error('Error response:', errorData)
          throw new Error(errorMsg)
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText.substring(0, 200)}`)
        }
      }

      try {
        const data = JSON.parse(responseText)
        console.log('Parsed data:', data)
        return data
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response:', responseText)
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`)
      }
    } catch (error: any) {
      console.error('API Error:', error)
      if (error.message) {
        throw error
      }
      throw new Error(error.toString() || 'Failed to call smart function')
    }
  }

  const fetchNFTMetadata = async () => {
    if (!contractAddress || !tokenId) return
    
    setLoading(true)
    try {
      const data = await callSmartFunction(`/metadata/${tokenId}`)
      setNftMetadata(data)
      setMessage(null)
    } catch (error: any) {
      console.error('Error fetching NFT metadata:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to fetch NFT metadata. Make sure the contract is deployed and the address is correct.' })
      setNftMetadata(null)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    if (!contractAddress || !buyerAddress) {
      setMessage({ type: 'error', text: 'Please fill in contract address and buyer address' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const purchaseData = {
        buyer: buyerAddress,
        tokenId: parseInt(tokenId) || 0
      }

      const response = await callSmartFunction('/purchase', 'POST', purchaseData)
      
      setMessage({ 
        type: 'success', 
        text: `Purchase successful! NFT has evolved to level ${response.metadata?.history?.totalPurchases || 'unknown'}` 
      })
      
      // Refresh metadata to show updated state
      await fetchNFTMetadata()
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to purchase NFT' 
      })
    } finally {
      setLoading(false)
    }
  }

  const getVariantColor = (variant: string) => {
    switch (variant) {
      case 'Legendary': return '#FFD700'
      case 'Epic': return '#9D4EDD'
      case 'Rare': return '#4A90E2'
      default: return '#6B7280'
    }
  }

  const getMilestoneIcon = (milestone: string) => {
    if (milestone.includes('20')) return '🌟'
    if (milestone.includes('10')) return '✨'
    if (milestone.includes('5')) return '⭐'
    return '💎'
  }

  // Don't auto-fetch on mount - let user click "Load NFT" button
  // useEffect(() => {
  //   if (contractAddress && tokenId) {
  //     fetchNFTMetadata()
  //   }
  // }, [contractAddress, tokenId])

  return (
    <div className="app">
      <div className="container">
        <header>
          <h1>💎 Evolving Crystal NFT</h1>
          <p className="subtitle">Watch your NFT evolve with each purchase - every collector becomes part of its history</p>
        </header>

        <div className="card">
          <h2>Contract Configuration</h2>
          <div className="form-group">
            <label htmlFor="contract">Smart Function Address</label>
            <input
              id="contract"
              type="text"
              placeholder="tz1..."
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="tokenId">Token ID</label>
            <input
              id="tokenId"
              type="number"
              placeholder="0"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="input"
              min="0"
            />
          </div>
          <button
            onClick={fetchNFTMetadata}
            className="btn-secondary"
            disabled={!contractAddress}
          >
            Load NFT
          </button>
        </div>

        {nftMetadata && (
          <div className="card nft-display">
            <div className="nft-header">
              <h2>{nftMetadata.name}</h2>
              <div className="growth-badge" style={{ backgroundColor: getVariantColor(nftMetadata.variant) }}>
                Level {nftMetadata.growthLevel}
              </div>
            </div>
            
            <div className="nft-visual">
              <div className="crystal-container">
                <div 
                  className="crystal" 
                  style={{
                    background: `linear-gradient(135deg, ${nftMetadata.color} 0%, ${getVariantColor(nftMetadata.variant)} 100%)`,
                    boxShadow: `0 0 30px ${getVariantColor(nftMetadata.variant)}40`
                  }}
                >
                  <div className="crystal-facets" style={{ '--level': nftMetadata.growthLevel } as any}>
                    {Array.from({ length: Math.min(nftMetadata.growthLevel, 20) }).map((_, i) => (
                      <div key={i} className="facet" style={{ transform: `rotate(${i * 18}deg)` }} />
                    ))}
                  </div>
                </div>
              </div>
              {nftMetadata.variant !== 'Common' && (
                <div className="variant-badge" style={{ borderColor: getVariantColor(nftMetadata.variant) }}>
                  {nftMetadata.variant}
                </div>
              )}
            </div>

            <div className="nft-info">
              <p className="description">{nftMetadata.description}</p>
              
              <div className="attributes-grid">
                {nftMetadata.attributes.map((attr, idx) => (
                  <div key={idx} className="attribute">
                    <span className="attr-name">{attr.name}:</span>
                    <span className="attr-value">{attr.value}</span>
                  </div>
                ))}
              </div>

              {nftMetadata.milestones && nftMetadata.milestones.length > 0 && (
                <div className="milestones">
                  <h3>🏆 Unlocked Milestones</h3>
                  <div className="milestone-list">
                    {nftMetadata.milestones.map((milestone, idx) => (
                      <span key={idx} className="milestone-badge">
                        {getMilestoneIcon(milestone)} {milestone}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="history">
                <h3>📜 Ownership History</h3>
                <p className="history-text">
                  <strong>{nftMetadata.history.totalPurchases}</strong> total purchases by{' '}
                  <strong>{nftMetadata.history.owners.length}</strong> unique collectors
                </p>
                {nftMetadata.history.owners.length > 0 && (
                  <div className="owners-list">
                    {nftMetadata.history.owners.slice(0, 5).map((owner, idx) => (
                      <span key={idx} className="owner-tag">{owner.slice(0, 8)}...</span>
                    ))}
                    {nftMetadata.history.owners.length > 5 && (
                      <span className="owner-tag">+{nftMetadata.history.owners.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <h2>Purchase & Evolve</h2>
          <p className="info-text">
            Each purchase increases the NFT's growth level, unlocking new visual forms and special traits!
          </p>
          
          <div className="form-group">
            <label htmlFor="buyer">Your Address (Buyer)</label>
            <input
              id="buyer"
              type="text"
              placeholder="tz1..."
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
              className="input"
            />
          </div>

          <button
            onClick={handlePurchase}
            disabled={loading || !contractAddress || !buyerAddress}
            className="btn-primary"
          >
            {loading ? 'Processing Purchase...' : '💎 Purchase & Evolve NFT'}
          </button>

          {nftMetadata && (
            <div className="purchase-preview">
              <p>After purchase, the NFT will evolve to level <strong>{nftMetadata.growthLevel + 1}</strong></p>
            </div>
          )}
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="card info-card">
          <h3>📝 How It Works</h3>
          <ol>
            <li>Enter your deployed evolving NFT smart function address</li>
            <li>Load the NFT to see its current state and growth level</li>
            <li>Enter your address and click "Purchase & Evolve"</li>
            <li>Each purchase increases the growth level, changing the visual form</li>
            <li>Milestones unlock at levels 1, 5, 10, and 20</li>
            <li>Every buyer becomes part of the NFT's permanent history</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default App
