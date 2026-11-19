import { ensureBootstrap } from "../src/bootstrap";
import { prisma } from "../src/lib/core";

ensureBootstrap()
  .then(() => console.log("seed concluído"))
  .finally(() => prisma.$disconnect());
