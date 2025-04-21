import { DAI_ADDRESS, JPYT_ADDRESS, USDC_ADDRESS, WRAPPED_SEPOLIA_ADDRESS } from './addresses'

export interface TokenOption {
  symbol: string
  name: string
  address: string
  logo: string
  balance?: string
}

export const TOKEN_OPTIONS: TokenOption[] = [
  {
    symbol: 'SEP',
    name: 'Sepolia ETH',
    address: 'SEP',
    logo: '/icons/eth.svg',
  },
  {
    symbol: 'WSEP',
    name: 'Wrapped Sepolia',
    address: WRAPPED_SEPOLIA_ADDRESS,
    logo: '/icons/weth.svg',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: DAI_ADDRESS,
    logo: '/icons/dai.svg',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: USDC_ADDRESS,
    logo: '/icons/usdc.svg',
  },
  {
    symbol: 'JPYT',
    name: 'JPT Coin',
    address: JPYT_ADDRESS,
    logo: '/icons/jpyt.svg',
  },
]
