export const createItemModel = (data = {}) => {
  return {
    id: data.id ?? '',
    device: data.device ?? '',
    status: data.status ?? 'off',
    room: data.room ?? '',
    description: data.description ?? '',
    image: data.image ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};
