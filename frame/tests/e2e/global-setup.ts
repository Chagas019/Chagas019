import setupDb from "../global-setup";

export default async function globalSetup() {
  await setupDb();
}
