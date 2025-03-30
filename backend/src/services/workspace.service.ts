import { ErrorCodeEnum } from "../enums/error-code.enum";
import { Roles } from "../enums/role.enum";
import { TaskStatusEnum } from "../enums/task.enum";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import RoleModel from "../models/roles-permission.model";
import TaskModel from "../models/task.model";
import UserModel from "../models/user.model";
import WorkspaceModel from "../models/workspace.model";
import { BadRequestException, NotFoundException } from "../utils/appError";
import mongoose from "mongoose";

export const createWorkspaceService = async (
    userId: string,
    body: {
        name: string;
        description?: string | undefined;
    }
) => {
    const { name, description } = body;

    const user = await UserModel.findById(userId);
    if(!user){
        throw new NotFoundException("Resource Not Found");
    }

    const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });

    if(!ownerRole){
        throw new NotFoundException("Resource Not Found");
    }

    const workspace = new WorkspaceModel({
        name: name,
        description: description,
        owner: user._id,
    });

    await workspace.save();

    const member =new MemberModel({
        userId: user._id,
        workspaceId: workspace._id,
        role: ownerRole._id,
        joinedAt: new Date(),
    });

    await member.save();

    user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
    await user.save();

    return {
        workspace,
    };
};

export const getAllWorkspacesUserIsMemberService = async (userId: string) => {
    const memberships = await MemberModel.find({ userId })
    .populate("workspaceId")
    .select("-password")
    .exec();

    const workspaces = memberships.map((membership) => membership.workspaceId);

    return { workspaces };
};

export const getWorkspaceByIdService = async (workspaceId: string) => {
    const workspace = await WorkspaceModel.findById(workspaceId);

    if(!workspace){
        throw new NotFoundException("Resource Not Found");
    }

    const members = await MemberModel.find({ workspaceId }).populate("role");

    const workspaceWithMembers = {
        ...workspace.toObject(),
        members,
    };

    return { workspace: workspaceWithMembers };
};

//GET WORKSPACE MEMBERS

export const getWorkspaceMembersService = async (workspaceId: string) => {
    // fetch all members of the workspace

    const members = await MemberModel.find({
        workspaceId,
    })
    .populate("userId", "name email profilePicture -password")
    .populate("role", "name");

    const roles = await RoleModel.find({}, { name: 1, _id: 1 })
    .select("-permission")
    .lean();

    return { members, roles };
    
};

export const getWorkspaceAnalyticsService = async (workspaceId: string) => {
    const currentDate = new Date();

    const totalTasks = await TaskModel.countDocuments({ 
        workspace: workspaceId, 
    });

    const overdueTasks = await TaskModel.countDocuments({
        workspace: workspaceId,
        dueDate: { $lt: currentDate },
        status: { $ne: TaskStatusEnum.DONE },
    });

    const completedTasks = await TaskModel.countDocuments({
        workspace: workspaceId,
        status: TaskStatusEnum.DONE,
    });

    const analytics = {
        totalTasks,
        overdueTasks,
        completedTasks,
    };

    return { analytics };
};

export const changeMemberRoleService = async (workspaceId: string, memberId: string, roleId: string) => {
    const workspace = await WorkspaceModel.findById(workspaceId);
    const role = await RoleModel.findById(roleId);

    if(!role){
        throw new NotFoundException("Resource Not Found");
    }

    const member = await MemberModel.findOne({
        userId: memberId,
        workspaceId: workspaceId,
    });

    if(!member){
        throw new Error("Member not found in the workspace");
    }

    member.role = role;
    await member.save();

    return {
        member,
    };
};

export const updateWorkspacebyIdService = async (workspaceId: string, name: string, description?: string) => {
    const workspace = await WorkspaceModel.findById(workspaceId);
    if(!workspace){
        throw new NotFoundException("Resource Not Found");

    }

    //update the workspace details
    workspace.name =name || workspace.name;
    workspace.description = description || workspace.description;
    await workspace.save();

    return {
        workspace,
    };
};

export const deleteWorkspaceService = async (workspaceId: string, userId: string) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try{
        const workspace = await WorkspaceModel.findById(workspaceId).session(session);
        if(!workspace){
            throw new NotFoundException("Resource Not Found");
        }

        if(workspace.owner.toString() !== userId){
            throw new BadRequestException("Bad Request");
        }

        const user = await UserModel.findById(userId).session(session);
        if(!user){
            throw new NotFoundException("Resource Not Found");
        }

        await ProjectModel.deleteMany({ workspace: workspace._id }).session(session);
        await TaskModel.deleteMany({ workspace: workspace._id }).session(session);
        await MemberModel.deleteMany({ workspaceId: workspace._id }).session(session);

        if(user?.currentWorkspace?.equals(workspaceId)){
            const memberWorkspace = await MemberModel.findOne({ userId }).session(session);

            user.currentWorkspace = memberWorkspace ? memberWorkspace.workspaceId : null;
            await user.save({ session });
        }

        await workspace.deleteOne({ session });
        await session.commitTransaction();
        session.endSession();
        return {
            currentWorkspace: user.currentWorkspace,
        }

    }
    catch(error){
        await session.abortTransaction();
        session.endSession();
        throw error;

    }
};
