import { User } from '../entity/user.entity';
import { UserDetailVo } from '../vo/user-info.vo';

export function createUserInfoVO(user: User) {
  const result = new UserDetailVo();
  result.id = user.id;
  result.email = user.email;
  result.username = user.username;
  result.headPic = user.headPic;
  result.phoneNumber = user.phoneNumber;
  result.nickName = user.nickName;
  result.createTime = user.createTime;
  result.isFrozen = user.isFrozen;
  return result;
}
