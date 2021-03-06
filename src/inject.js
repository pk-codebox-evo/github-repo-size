/* global fetch, Request, Headers */

const API = 'https://api.github.com/repos/'
const LI_TAG_ID = 'github-repo-size'

function isTree (uri) {
  var repoURI = uri.split('/')
  return repoURI.length === 2 || repoURI[2] === 'tree'
}

function getRepoInfoURI (uri) {
  var repoURI = uri.split('/')
  return repoURI[0] + '/' + repoURI[1]
}

function getRepoContentURI (uri) {
  var repoURI = uri.split('/')
  var treeBranch = repoURI.splice(2, 2, 'contents')

  if (treeBranch && treeBranch[1]) {
    repoURI.push('?ref=' + treeBranch[1])
  }

  return repoURI.join('/')
}

function getHumanReadableSizeObject (bytes) {
  if (bytes === 0) {
    return {
      size: 0,
      measure: 'Bytes'
    }
  }

  const K = 1024
  const MEASURE = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(K))

  return {
    size: parseFloat((bytes / Math.pow(K, i)).toFixed(2)),
    measure: MEASURE[i]
  }
}

function getHumanReadableSize (size) {
  if (size === null) return ''

  var t = getHumanReadableSizeObject(size)
  return t.size + ' ' + t.measure
}

function getSizeHTML (size) {
  const humanReadableSize = getHumanReadableSizeObject(size)
  return '<li id="' + LI_TAG_ID + '">' +
    '<a>' +
    '<svg class="octicon octicon-database" aria-hidden="true" height="16" version="1.1" viewBox="0 0 12 16" width="12">' +
    '<path d="M6 15c-3.31 0-6-.9-6-2v-2c0-.17.09-.34.21-.5.67.86 3 1.5 5.79 1.5s5.12-.64 5.79-1.5c.13.16.21.33.21.5v2c0 1.1-2.69 2-6 2zm0-4c-3.31 0-6-.9-6-2V7c0-.11.04-.21.09-.31.03-.06.07-.13.12-.19C.88 7.36 3.21 8 6 8s5.12-.64 5.79-1.5c.05.06.09.13.12.19.05.1.09.21.09.31v2c0 1.1-2.69 2-6 2zm0-4c-3.31 0-6-.9-6-2V3c0-1.1 2.69-2 6-2s6 .9 6 2v2c0 1.1-2.69 2-6 2zm0-5c-2.21 0-4 .45-4 1s1.79 1 4 1 4-.45 4-1-1.79-1-4-1z"></path>' +
    '</svg>' +
    '<span class="num text-emphasized"> ' +
    humanReadableSize.size +
    '</span> ' +
    humanReadableSize.measure +
    '</a>' +
    '</li>'
}

function checkStatus (response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  }

  throw Error(`GitHub returned a bad status: ${response.status}`)
}

function parseJSON (response) {
  if (response) {
    return response.json()
  }

  throw Error('Could not parse JSON')
}

function getAPIData (uri, callback) {
  var request = new Request(API + uri, {
    headers: new Headers({
      'User-Agent': 'harshjv/github-repo-size'
    })
  })

  fetch(request)
    .then(checkStatus)
    .then(parseJSON)
    .then(callback)
    .catch(e => console.error(e))
}

function getFileName (text) {
  return text.trim().split('/')[0]
}

function checkForRepoPage () {
  var repoURI = window.location.pathname.substring(1)

  if (isTree(repoURI)) {
    var ns = document.querySelector('ul.numbers-summary')
    var liElem = document.getElementById(LI_TAG_ID)
    var tdElems = document.querySelector('span.github-repo-size-td')

    if (ns && !liElem) {
      getAPIData(getRepoInfoURI(repoURI), function (data) {
        if (data && data.size) {
          ns.insertAdjacentHTML('beforeend', getSizeHTML(data.size * 1024))
        }
      })
    }

    if (!tdElems) {
      getAPIData(getRepoContentURI(repoURI), function (data) {
        var sizeArray = {}

        var upTree = document.querySelector('div.file-wrap > table > tbody > tr.up-tree > td > a.js-navigation-open')

        if (upTree) {
          upTree.parentNode.parentNode.appendChild(document.createElement('td'))
        }

        for (var item of data) {
          sizeArray[item.name] = item.type !== 'dir' ? item.size : null
        }

        var contents = document.querySelectorAll('div.file-wrap > table > tbody:last-child tr > td.content > span > a')
        var ageForReference = document.querySelectorAll('div.file-wrap > table > tbody:last-child tr > td.age')

        var i = 0

        for (var o of contents) {
          var t = sizeArray[getFileName(o.text)]

          var td = document.createElement('td')
          td.className = 'age'
          td.innerHTML = '<span class="css-truncate css-truncate-target github-repo-size-td">' + getHumanReadableSize(t) + '</span>'

          o.parentNode.parentNode.parentNode.insertBefore(td, ageForReference[i++])
        }
      })
    }
  }
}

checkForRepoPage()

document.addEventListener('pjax:end', checkForRepoPage, false)
