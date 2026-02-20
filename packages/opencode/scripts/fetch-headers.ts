const response = await fetch("https://google.com")
console.log("Status:", response.status)
console.log("\nHeaders:")
for (const [key, value] of response.headers) {
  console.log(`${key}: ${value}`)
}
