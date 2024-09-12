export function isMatch(from: string, url: string): boolean {
  let regex: RegExp
  try {
    regex = new RegExp(from, 'ig')
  } catch (error) {
    console.error('Invalid regex', from, error)
    return false
  }
  return regex.test(url)
}

export function replaceUrl(url: string, from: string, to: string): string {
  const regex = new RegExp(from, 'ig')
  return url.replace(regex, to)
}
