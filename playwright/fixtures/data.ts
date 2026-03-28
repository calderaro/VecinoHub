import { createDisposableId, disposableEmail, disposableLabel } from "../utils/test-data";

export function makeNeighborhoodName() {
  return disposableLabel("E2E Neighborhood");
}

export function makeGroupName() {
  return disposableLabel("E2E Group");
}

export function makePollTitle() {
  return disposableLabel("E2E Poll");
}

export function makeCampaignTitle() {
  return disposableLabel("E2E Campaign");
}

export function makeEventTitle() {
  return disposableLabel("E2E Event");
}

export function makePostTitle() {
  return disposableLabel("E2E Post");
}

export function makeUserEmail() {
  return disposableEmail();
}

export function makeSlugSuffix() {
  return createDisposableId();
}
