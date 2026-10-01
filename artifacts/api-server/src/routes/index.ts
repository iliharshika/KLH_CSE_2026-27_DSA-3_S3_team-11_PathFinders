import { Router, type IRouter } from "express";
import healthRouter from "./health";
import treeRouter from "./tree";

const router: IRouter = Router();

router.use(healthRouter);
router.use(treeRouter);

export default router;
