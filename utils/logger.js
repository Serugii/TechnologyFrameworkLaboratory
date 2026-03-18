import config from '#config';

function log(level, method, path, status) {
  const time = new Date().toISOString();
  console.log(`${time} | ${level} | ${method} | ${path} | ${status}`);
}

export function handleLog(method, path, status) {
  if (config.NODE_ENV === 'development') {
    let level = 'INFO';
    if (status >= 400 && status < 500) level = 'WARN';
    if (status >= 500) level = 'ERROR';
    log(level, method, path, status);
  }
  if (config.NODE_ENV === 'production' && status >= 400) {
    let level = 'WARN';
    if (status >= 500) level = 'ERROR';
    log(level, method, path, status);
  }
}

export default { handleLog };
