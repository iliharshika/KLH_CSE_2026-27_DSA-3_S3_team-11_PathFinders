import { Router, type IRouter } from "express";
import {
  CalculateTreeDiameterBody,
  CalculateTreeDiameterResponse,
  GenerateTreeBody,
  GenerateTreeResponse,
} from "@workspace/api-zod";
import {
  calculateDiameter,
  generateRandomTree,
  isValidTree,
} from "../lib/tree";

const router: IRouter = Router();

router.post("/tree/generate", (req, res): void => {
  const parsed = GenerateTreeBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.issues }, "Invalid tree generation request");
    res.status(400).json({ error: "Choose a whole number of nodes between 2 and 1,000." });
    return;
  }

  const tree = generateRandomTree(parsed.data.nodes);
  res.json(GenerateTreeResponse.parse(tree));
});

router.post("/tree/diameter", (req, res): void => {
  const parsed = CalculateTreeDiameterBody.safeParse(req.body);
  if (!parsed.success || !isValidTree(parsed.success ? parsed.data : ({} as never))) {
    req.log.warn("Invalid tree diameter request");
    res.status(400).json({ error: "The generated tree is invalid. Generate a new tree and try again." });
    return;
  }

  try {
    const result = calculateDiameter(parsed.data);
    res.json(CalculateTreeDiameterResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Tree diameter calculation failed");
    res.status(400).json({ error: "The tree diameter could not be calculated. Generate a new tree and try again." });
  }
});

export default router;