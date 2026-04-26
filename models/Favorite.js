import mongoose, {Schema} from "mongoose";

const favoriteSchema = new Schema({
    userId:{
         type: Schema.Types.ObjectId,
         ref:'user',
         required:true
    },
    menuItemId:{
        type: Schema.Types.ObjectId,
        ref:'menuItem',
        required:true
    }
})
favoriteSchema.index(
    {userId: 1, menuItemId: 1},
    {unique: true}
)
export const Favorite = mongoose.model('favorite', favoriteSchema);