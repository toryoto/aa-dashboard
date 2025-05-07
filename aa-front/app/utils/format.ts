export const formatDate = (timestamp: string): string => {
  const date = new Date(Number(timestamp) * 1000)
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const shortenHex = (hex: string): string => {
  if (!hex) return ''
  return `${hex.slice(0, 6)}...${hex.slice(-4)}`
}
