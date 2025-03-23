import mongoose, { Document, Schema } from "mongoose";
import { PermissionType, Roles, Permissions, RoleType } from "../enums/role.enum";
import { RolePermissions } from "../utils/role-permission";

export interface RoleDocument extends Document {
    name: string;
    permissions: Array<PermissionType>;
}

const roleSchema = new Schema<RoleDocument>({
    name: {
        type: String,
        enum: Object.values(Roles),
        required: true,
        unique: true,
    },
    permissions: {
        type: [String],
        enum: Object.values(Permissions),
        required: true,
        default: function(this: RoleDocument){
            return RolePermissions[this.name as RoleType];
        },
    },
}, 
{
    timestamps: true,
}
);

const RoleModel = mongoose.model<RoleDocument>("Role", roleSchema);

export default RoleModel;
