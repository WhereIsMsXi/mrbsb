import { Repository } from 'typeorm';
import { User } from '../entity/user.entity';

export async function findUserById(
  userRepository: Repository<User>,
  userId: number,
  isAdmin: boolean,
) {
  const user = await userRepository.findOne({
    where: {
      id: userId,
      isAdmin,
    },
    relations: ['roles', 'roles.permissions'],
  });

  return {
    id: user.id,
    username: user.username,
    nickName: user.nickName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    headPic: user.headPic,
    createTime: user.createTime.getTime(),
    isFrozen: user.isFrozen,
    isAdmin: user.isAdmin,
    roles: user.roles.map((item) => item.name),
    permissions: user.roles.reduce((arr, item) => {
      item.permissions.forEach((permission) => {
        if (arr.indexOf(permission) === -1) {
          arr.push(permission);
        }
      });
      return arr;
    }, []),
  };
}
