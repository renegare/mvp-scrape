const request = require('request-promise')
const $ = require('cheerio')
const fs = require('fs')
const _ = require('lodash')
const log = require('debug')('debug')
const warn = require('debug')('warn')
const info = require('debug')('info')
const error = require('debug')('error')

const debug = false
const host = 'http://www.bbc.co.uk'
const url = 'http://www.bbc.co.uk/news'
const pattern = /<a .*href="(\/news\/[^"]+-\d+)"/ig

const download = (url, parse) => {
  parse = parse || (c => c)
  const tmpFile = `./tmp/${url.replace(/[^a-z0-9]+/g, '_')}.html`
  const content = fs.existsSync(tmpFile) ? fs.readFileSync(tmpFile, 'utf8') : null
  return content? Promise.resolve(content) : request(url)
    .then(parse)
    .then(content => {
      if (content) {
        fs.writeFileSync(tmpFile, content)
        log(`downloaded ${url} to ${tmpFile}`)
      }
      return content
    })
}

const articleLinkExtractor = (pattern) => (content) => {
  const links = _.uniq(content.match(pattern)
    .map(m => m.replace(pattern, '$1')))
  links.sort()
  return links
}

const articleExtractor = (host, download) => (uri) => {
  const url = `${host}${uri}`
  log(`download article ${url}`)
  return download(url, (content) => {
    const article = $(content).find('.story-body')
    if (article.length !== 1) {
      warn(`Could not extract an article from: ${url}`)
      return
    }
    log(`extracted article from ${url}`)
    return article.html();
  })

}

download(url)
  .then(articleLinkExtractor(pattern))
  .then(links => {
    info(`Found ${links.length} links from ${url}`)
    const extractor = articleExtractor(host, download)
    const articles = links.slice(0, debug ? 1 : undefined)
      .map(link => extractor(link).then(content => !!content))
    return Promise.all(articles)
  })
  .then(articles => articles.filter(a => a))
  .then(articles => info(`Downloaded ${articles.length} article(s)`))
  .catch(err => {
    error(err.message, err.stack)
  })
