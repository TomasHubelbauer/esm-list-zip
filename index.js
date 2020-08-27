const textDecoder = new TextDecoder();

export default async function *listZip(
  /** @type {string} */ url,
  /** @type {(start: number, end: number, target: string) => void} */ onFetch,
  /** @type {() => void} */ onNoRange
) {
  // Download the HEAD response to find out what the size of the archive is
  const response = await fetch(url, { method: 'HEAD' });
  const size = Number(response.headers.get('Content-Length'));
  
  let dataView;

  // Search for the end of central directory record signature (0x06054b50)
  let eocdOffsetFromEnd;
  do {
    // Start with a 1 kB buffer and download 1 kB more on each subsequent attempt
    const rangeOffetFromEnd = dataView ? dataView.byteLength + 1024 : 1024;

    // TODO: Fetch only the missing preceeding part not it and the part we already have when retrying
    const start = size - rangeOffetFromEnd;
    const end = size;

    onFetch(start, end, 'EOCD');

    // Download the start-end range of the file to look for the end of central directory record
    // https://en.wikipedia.org/wiki/Zip_(file_format)#End_of_central_directory_record_(EOCD)
    const response = await fetch(url, { headers: { 'Range': `bytes=${start}-${end}` } });
    const arrayBuffer = await response.arrayBuffer();
    dataView = new DataView(arrayBuffer);
    
    // TODO: Do not fetch anymore since this means we have the whole buffer, just search within it
    // Detect and notify about range requests not being available
    if (dataView.byteLength === size) {
      onNoRange();
    }

    // TODO: Search from the end in case of no fetch range support to find faster
    for (let index = 4; index < dataView.byteLength - 4; index++) {
      if (dataView.getUint8(dataView.byteLength - index + 3) !== 0x06) {
        continue;
      }

      if (dataView.getUint8(dataView.byteLength - index + 2) !== 0x05) {
        continue;
      }

      if (dataView.getUint8(dataView.byteLength - index + 1) !== 0x4b) {
        continue;
      }

      if (dataView.getUint8(dataView.byteLength - index) !== 0x50) {
        continue;
      }

      eocdOffsetFromEnd = index;
      break;
    }
  }
  // TODO: Stop at a threshold (10 % of the size?) so on bug we avoid progressively downloading the whole archive for nothing
  while (!eocdOffsetFromEnd);

  // Parse the central directory record offset and size
  const cdOffsetFromStart = dataView.getUint32(dataView.byteLength - eocdOffsetFromEnd + 16, true);
  const cdSize = dataView.getUint32(dataView.byteLength - eocdOffsetFromEnd + 12, true);

  // TODO: Add a redundant check for no-range from aboce, if we know we have the whole archive, skip to the else immediately
  // Fetch yet larger chunk if the central directory structure if out of the bounds still
  if (size - cdOffsetFromStart > dataView.byteLength) {
    const start = cdOffsetFromStart;
    const end = cdOffsetFromStart + cdSize;

    onFetch(start, end, 'CD');

    // TODO: Download only the missing portion not the entire central directory structure range
    const response = await fetch(url, { headers: { 'Range': `bytes=${start}-${end}` } });
    const arrayBuffer = await response.arrayBuffer();
    dataView = new DataView(arrayBuffer);
  }
  else {
    // TODO: Do not assume we have the full archive here, instead calculate the start correctly
    dataView = new DataView(dataView.buffer, cdOffsetFromStart, cdSize);
  }

  let index = 0;
  do {
    const fileNameLength = dataView.getUint16(index + 28, true);
    const extraFieldLength = dataView.getUint16(index + 30, true);
    const fileCommentLength = dataView.getUint16(index + 32, true);
    const name = textDecoder.decode(new Uint8Array(dataView.buffer, dataView.byteOffset + index + 46, fileNameLength));
    const offset = dataView.getUint32(index + 42, true);
    const size = 30 /* local header */ + fileNameLength + dataView.getUint32(index + 20, true);

    // TODO: Do not assume the full archive is downloaded here, only offer when available, otherwise offer offset and size numbers
    yield { name, offset, size, content: dataView.buffer.slice(offset, offset + size), size };

    index = index + 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }
  while (index < dataView.byteLength - 1);
}
