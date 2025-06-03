// generate-sitemap.js
const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');

const sitemap = new SitemapStream({ hostname: 'https://rshf.net' }); // TODO: Replace with your domain

// List your static routes here
const routes = [
  '/login',
  '/register',
  '/about'
];

routes.forEach(route => {
  sitemap.write({ url: route, changefreq: 'weekly', priority: 0.8 });
});
sitemap.end();

streamToPromise(sitemap).then(sm => {
  createWriteStream('./public/sitemap.xml').end(sm);
  console.log('Sitemap generated in public/sitemap.xml');
});
