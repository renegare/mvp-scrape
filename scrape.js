const request = require('request-promise')
const $ = require('cheerio')
const fs = require('fs')
const _ = require('lodash')
const log = require('debug')('info')

const debug = false
const host = 'http://www.bbc.co.uk'
const url = 'http://www.bbc.co.uk/news'
const pattern = /<a .*href="(\/news\/[^"]+-\d+)"/ig

const getContent = (url) => {
  log(`get content from ${url}`)
  const tmpFile = `./tmp/${url.replace(/[^a-z0-9]+/g, '_')}.html`
  const content = fs.existsSync(tmpFile) ? fs.readFileSync(tmpFile, 'utf8') : null
  return content? Promise.resolve(content) : request(url)
    .then(content => {
      fs.writeFileSync(tmpFile, content)
      log(`downloaded content to: ${tmpFile}`)
      return content
    })
}

const extractArticleLinks = (pattern) => (content) => {
  const links = _.uniq(content.match(pattern)
    .map(m => m.replace(pattern, '$1')))
  links.sort()
  return links
}

const downloadArticle = (host) => (uri) => {
  log(`download article from: ${host}${uri}`)
  return getContent(`${host}${uri}`)

}

getContent(url)
  .then(extractArticleLinks(pattern))
  .then(links => {
    return Promise.all(links.slice(0, debug ? 1 : undefined).map(downloadArticle(host)))
  })
  .then(articles => log(`Downloaded ${articles.length} article(s)`))
  .catch(err => {
    log(':(', err)
  })
