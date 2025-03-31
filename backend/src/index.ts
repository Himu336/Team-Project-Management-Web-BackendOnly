import "dotenv/config";
import express, {NextFunction, Request, Response} from "express";
import cors from "cors";
import expressSession from "express-session";
import { config } from "./config/app.config";
import connectDatabase from "./config/database.config";
import { HTTPSTATUS } from "./config/http.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { asyncHandler } from "./middlewares/asyncHandler.middleware";
import "./config/passport.config";
import passport from "passport";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import isAuthenticated from "./middlewares/isAuthenticated.middleware";
import workspaceRoutes from "./routes/workspace.route";
import memberRoutes from "./routes/member.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.route";

const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(
    expressSession({
        secret: config.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24*60*60*1000,
            secure: config.NODE_ENV === "production",
            httpOnly: true,
            sameSite: "lax"
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(
    cors({
        origin: config.FRONTEND_ORIGIN,
        credentials: true,
    })
);

app.get("/", asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    return res.status(HTTPSTATUS.OK).json({
        message: "Hello World",
    });
})
);

app.use(`${BASE_PATH}/auth` , authRoutes);
app.use(`${BASE_PATH}/user` , isAuthenticated, userRoutes);
app.use(`${BASE_PATH}/workspace` , isAuthenticated, workspaceRoutes);
app.use(`${BASE_PATH}/member` , isAuthenticated, memberRoutes);
app.use(`${BASE_PATH}/project` , isAuthenticated, projectRoutes);
app.use(`${BASE_PATH}/task` , isAuthenticated, taskRoutes);

app.use(errorHandler);

app.listen(config.PORT, async () => {
    console.log(`Server is running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    await connectDatabase();
});

