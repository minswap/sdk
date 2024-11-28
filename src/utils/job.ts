export type RunRecurringJobParams = {
  name: string;
  interval: number;
  job: () => Promise<void>;
};

/**
 * Run job with consideration of job taking longer than interval.
 *
 * If job finish less than interval, wait (interval - execution time) until next run.
 *
 * If job finish longer than interval, start immediately
 */
export async function runRecurringJob({
  name,
  job,
  interval,
}: RunRecurringJobParams): Promise<void> {
  while (true) {
    const startTime = Date.now();

    try {
      await job();
    } catch (err) {
      console.error(`Job ${name} fail: ${err}`);
    }

    const timeTook = Date.now() - startTime;
    console.log(`done job ${name}, took ${timeTook / 1000}s`);

    if (timeTook < interval) {
      await sleep(interval - timeTook);
    }
  }
}

async function sleep(durationInMs: number): Promise<unknown> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ error: false, message: `Slept for ${durationInMs} ms` });
    }, durationInMs);
  });
}
