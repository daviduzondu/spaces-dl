fetch('https://twitter.com/?mx=1', {
  headers: {
    'User-Agent': 'curl/7.81.0',
    accept: '*/*',
    'Content-Type': 'application/json',
    
  },
})
  .then((x) => x.text())
  .then((d) => console.log(d));
