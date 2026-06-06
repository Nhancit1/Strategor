// Shared toJSON transform: _id -> id (string), strip __v, drop sensitive/internal fields.
export function baseToJSON(hidden = []) {
  return {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = ret._id?.toString();
      delete ret._id;
      for (const h of hidden) delete ret[h];
      return ret;
    },
  };
}
