import { ponder } from "ponder:registry";
import {
  VeasfLocks,
  VeasfLockExtended,
  VeasfLocksFrozen,
  VeasfLockUnfrozen,
} from "ponder:schema";
import { v4 as uuidv4 } from "uuid";

// veASF locks
ponder.on("Veasf:LockCreated", async ({ event, context }) => {
  const account = event.args.account;
  const amount = event.args.amount;
  const weeks = event.args._weeks;
  const timestamp = event.block.timestamp;

  await context.db.insert(VeasfLocks).values({
    id: uuidv4(),
    account: account,
    amount: amount,
    weeks: weeks,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
  });
});

ponder.on("Veasf:LocksCreated", async ({ event, context }) => {
  const account = event.args.account;
  const newLocks = event.args.newLocks;
  const timestamp = event.block.timestamp;

  for (const lock of newLocks) {
    await context.db.insert(VeasfLocks).values({
      id: uuidv4(),
      account: account,
      amount: lock.amount,
      weeks: lock.weeksToUnlock,
      timestamp: timestamp,
      transactionHash: event.transaction.hash,
    });
  }
});

ponder.on("Veasf:LockExtended", async ({ event, context }) => {
  const account = event.args.account;
  const amount = event.args.amount;
  const weeks = event.args._weeks;
  const newWeeks = event.args.newWeeks;
  const timestamp = event.block.timestamp;

  await context.db.insert(VeasfLockExtended).values({
    id: uuidv4(),
    account: account,
    amount: amount,
    weeks: weeks,
    newWeeks: newWeeks,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
  });
});

ponder.on("Veasf:LocksExtended", async ({ event, context }) => {
  const account = event.args.account;
  const locks = event.args.locks;
  const timestamp = event.block.timestamp;

  for (const lock of locks) {
    await context.db.insert(VeasfLockExtended).values({
      id: uuidv4(),
      account: account,
      amount: lock.amount,
      weeks: lock.currentWeeks,
      newWeeks: lock.newWeeks,
      timestamp: timestamp,
      transactionHash: event.transaction.hash,
    });
  }
});

ponder.on("Veasf:LocksFrozen", async ({ event, context }) => {
  const account = event.args.account;
  const amount = event.args.amount;
  const timestamp = event.block.timestamp;

  await context.db.insert(VeasfLocksFrozen).values({
    id: uuidv4(),
    account: account,
    amount: amount,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
  });
});

ponder.on("Veasf:LocksUnfrozen", async ({ event, context }) => {
  const account = event.args.account;
  const amount = event.args.amount;
  const timestamp = event.block.timestamp;

  await context.db.insert(VeasfLockUnfrozen).values({
    id: uuidv4(),
    account: account,
    amount: amount,
    timestamp: timestamp,
    transactionHash: event.transaction.hash,
  });
});
