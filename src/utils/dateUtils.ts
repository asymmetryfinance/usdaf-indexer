// utility: converts block ts to UTC 0000 of the day
export function getStartOfDayUTC(unixTimestamp: number) {
  const date = new Date(unixTimestamp * 1000);
  return (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
    1000
  );
}
