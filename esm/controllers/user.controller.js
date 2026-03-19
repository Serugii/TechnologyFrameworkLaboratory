import * as userRepository from '../repositories/user.repository.js';
import { count } from '../state/request-counter.js';

export const getUsers = async (request, reply) => {
  count++;

  const users = await userRepository.findAll();
  return { users };
};

const getUserById = async (request, reply) => {
  count++;
  const { id } = request.params;
  const user = await userRepository.findById(id);
  if (!user) {
    return reply.status(404).send({ error: 'User not found' });
  }
  return { user };
};

export default {
  getUsers,
  getUserById,
};
