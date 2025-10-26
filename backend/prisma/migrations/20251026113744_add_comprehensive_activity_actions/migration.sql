-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'REGISTER';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_USERNAME';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_AVATAR';
ALTER TYPE "ActivityAction" ADD VALUE 'REMOVE_AVATAR';
ALTER TYPE "ActivityAction" ADD VALUE 'READ_MESSAGE';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETE_MESSAGE';
ALTER TYPE "ActivityAction" ADD VALUE 'CREATE_CONVERSATION';
ALTER TYPE "ActivityAction" ADD VALUE 'JOIN_CLASS';
ALTER TYPE "ActivityAction" ADD VALUE 'LEAVE_CLASS';
ALTER TYPE "ActivityAction" ADD VALUE 'ASSIGN_TRAINER';
ALTER TYPE "ActivityAction" ADD VALUE 'UNASSIGN_TRAINER';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_ORDER';
ALTER TYPE "ActivityAction" ADD VALUE 'CANCEL_ORDER';
ALTER TYPE "ActivityAction" ADD VALUE 'SHIP_ORDER';
ALTER TYPE "ActivityAction" ADD VALUE 'DELIVER_ORDER';
ALTER TYPE "ActivityAction" ADD VALUE 'ADD_TO_CART';
ALTER TYPE "ActivityAction" ADD VALUE 'REMOVE_FROM_CART';
ALTER TYPE "ActivityAction" ADD VALUE 'CHECKOUT';
ALTER TYPE "ActivityAction" ADD VALUE 'CREATE_PRODUCT';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_PRODUCT';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETE_PRODUCT';
ALTER TYPE "ActivityAction" ADD VALUE 'REFUND';
ALTER TYPE "ActivityAction" ADD VALUE 'DEACTIVATE_USER';
ALTER TYPE "ActivityAction" ADD VALUE 'ACTIVATE_USER';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_USER_ROLE';
ALTER TYPE "ActivityAction" ADD VALUE 'DELETE_USER';
ALTER TYPE "ActivityAction" ADD VALUE 'GENERATE_REPORT';
ALTER TYPE "ActivityAction" ADD VALUE 'VIEW_ANALYTICS';
