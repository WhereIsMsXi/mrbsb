import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { User } from '../entity/user.entity';
import { md5 } from 'src/utils/utils';
import { LoginVo } from '../vo/login.vo';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export function validateLoginUser(user: User, loginDto: LoginDto) {
  if (!user) {
    throw new HttpException('用户不存在', HttpStatus.BAD_REQUEST);
  }

  if (user.password !== md5(loginDto.password)) {
    throw new HttpException('密码错误', HttpStatus.BAD_REQUEST);
  }
}

export function createLoginUserVo(user: User) {
  const vo = new LoginVo();
  vo.userInfo = {
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
  return vo;
}

export function signAccessToken(
  jwtService: JwtService,
  configService: ConfigService,
  vo: LoginVo,
) {
  const accessToken = jwtService.sign(
    {
      userId: vo.userInfo.id,
      username: vo.userInfo.username,
      roles: vo.userInfo.roles,
      permissions: vo.userInfo.permissions,
    },
    {
      expiresIn: configService.get('jwt_access_token_expires_in') || '30m',
    },
  );
  return accessToken;
}

export function signRefreshToken(
  jwtService: JwtService,
  configService: ConfigService,
  vo: LoginVo,
) {
  const refreshToken = jwtService.sign(
    {
      userId: vo.userInfo.id,
    },
    {
      expiresIn: configService.get('jwt_refresh_token_expires_in') || '7d',
    },
  );
  return refreshToken;
}
