import { ApiError, buildUrl, errorMessage, safeParse } from './client'

/**
 * PUTs a master straight to the URL the gateway issued: the local signed endpoint now, an S3
 * presigned URL in production. XMLHttpRequest rather than fetch, because fetch reports no
 * upload progress.
 *
 * No Authorization header: the URL's signature is the authorisation, as with S3, and a bearer
 * token has no business travelling to object storage.
 *
 * @param {string} uploadUrl  Absolute, or a path the dev proxy forwards.
 * @param {File} file
 * @param {{ method?: string, contentType?: string, signal?: AbortSignal,
 *           onProgress?: (fraction: number, loaded: number, total: number) => void }} [options]
 * @returns {Promise<unknown>} The response body, if any.
 */
export function putFile(uploadUrl, file, options = {}) {
  const { method = 'PUT', contentType, signal, onProgress } = options
  const url = /^https?:\/\//i.test(uploadUrl) ? uploadUrl : buildUrl(uploadUrl)

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'))
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    if (contentType) xhr.setRequestHeader('Content-Type', contentType)

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return
      const total = event.lengthComputable ? event.total : file.size
      onProgress(total ? event.loaded / total : 0, event.loaded, total)
    }

    xhr.onload = () => {
      signal?.removeEventListener('abort', onAbort)
      const payload = xhr.responseText ? safeParse(xhr.responseText) : null
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1, file.size, file.size)
        resolve(payload)
        return
      }
      const message = errorMessage(
        xhr.status,
        payload,
        xhr.getResponseHeader('WWW-Authenticate'),
        `The upload failed with ${xhr.status}`,
      )
      reject(new ApiError(xhr.status, message, payload))
    }

    // A network-level failure: the gateway is down, or it refused the CORS preflight because
    // this app's origin is not in adventwave.cors.allowed-origins. The browser hides which.
    xhr.onerror = () => {
      signal?.removeEventListener('abort', onAbort)
      reject(
        new ApiError(
          0,
          'The upload could not reach the server. Check that the gateway is running and that ' +
            'this origin is in adventwave.cors.allowed-origins.',
          null,
        ),
      )
    }

    xhr.onabort = () => {
      signal?.removeEventListener('abort', onAbort)
      reject(new DOMException('Upload cancelled', 'AbortError'))
    }

    function onAbort() {
      xhr.abort()
    }
    signal?.addEventListener('abort', onAbort)

    xhr.send(file)
  })
}
