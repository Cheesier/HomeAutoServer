export function rateLimit(
  fn: any,
  delay: number,
  context?: any
): (...args: any[]) => void {
  const queue: any[] = [];
  let timer: any = null;

  function processQueue() {
    const item = queue.shift();
    if (item) {
      fn.apply(item.context, item.arguments);
    }
    if (queue.length === 0) {
      clearInterval(timer), (timer = null);
    }
  }

  return function limited(this: any) {
    queue.push({
      context: context || this,
      arguments: [].slice.call(arguments),
    });
    if (!timer) {
      processQueue(); // start immediately on the first invocation
      timer = setInterval(processQueue, delay);
    }
  };
}
