const adjectives = ['Cosmic', 'Shadow', 'Nova', 'Pixel', 'Sleepy', 
                    'Silent', 'Neon', 'Amber', 'Crystal', 'Ghost']
const nouns      = ['Fox', 'Bear', 'Wolf', 'Tiger', 'Leaf', 
                    'Storm', 'Cat', 'Hawk', 'River', 'Star']
const colors     = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4',
                    '#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F']

export function generateUser() {
  const adj   = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun  = nouns[Math.floor(Math.random() * nouns.length)]
  const color = colors[Math.floor(Math.random() * colors.length)]
  return { username: `${adj}${noun}`, color }
}