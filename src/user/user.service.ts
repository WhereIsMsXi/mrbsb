import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { RegisterUserDto } from './dto/register.dto';
import { RedisService } from 'src/redis/redis.service';
import {
  createUser,
  validateCaptcha,
  validateRegisterUser,
} from './em/register.em';
import { EmailService } from 'src/email/email.service';
import { getCode, md5 } from 'src/utils/utils';
import { Role } from './entity/role.entity';
import { Permission } from './entity/permission.entity';
import { LoginDto } from './dto/login.dto';
import {
  createLoginUserVo,
  signAccessToken,
  signRefreshToken,
  validateLoginUser,
} from './em/login.em';
import { findUserById } from './em/refresh.em';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { validateUpdatePasswordCaptcha } from './em/update-password.em';
import { UpdateUserDto } from './dto/update-user.dto';
import { RefreshTokenVo } from './vo/refresh-token.vo';
import { UserListVo } from './vo/user-list.vo';

@Injectable()
export class UserService {
  private logger = new Logger();

  @InjectRepository(User)
  private userRepository: Repository<User>;

  @InjectRepository(Role)
  private roleRepository: Repository<Role>;

  @InjectRepository(Permission)
  private permissionRepository: Repository<Permission>;

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(EmailService)
  private emailService: EmailService;

  @Inject(JwtService)
  private jwtService: JwtService;

  @Inject(ConfigService)
  private configService: ConfigService;

  async register(user: RegisterUserDto) {
    const captcha = await this.redisService.get(`captcha_${user.email}`);
    validateCaptcha(captcha, user.captcha);

    const foundUser = await this.userRepository.findOneBy({
      username: user.username,
    });
    validateRegisterUser(foundUser);

    const newUser = await createUser(user);

    try {
      await this.userRepository.save(newUser);
      return '注册成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '注册失败';
    }
  }
  async registerCatpcha(address: string) {
    try {
      const code = getCode();
      await this.redisService.set(`captcha_${address}`, code, 5 * 60);

      await this.emailService.sendMail({
        to: address,
        subject: '注册验证码',
        html: `<div>
          <p>您好，欢迎注册，</p>
          <p>您的注册验证码是 ${code}</p>
        </div>`,
      });
      return '发送成功';
    } catch (err) {
      console.log(err);
    }
  }

  async login(loginDto: LoginDto, isAdmin: boolean) {
    const user = await this.userRepository.findOne({
      where: {
        username: loginDto.username,
        isAdmin,
      },
      relations: ['roles', 'roles.permissions'],
    });
    validateLoginUser(user, loginDto);

    const vo = createLoginUserVo(user);
    vo.accessToken = signAccessToken(
      this.jwtService,
      this.configService,
      vo.userInfo,
    );
    vo.refreshToken = signRefreshToken(
      this.jwtService,
      this.configService,
      vo.userInfo,
    );

    return vo;
  }
  async refresh(refreshToken: string, isAdmin: boolean) {
    try {
      const data = this.jwtService.verify(refreshToken);
      const user = await findUserById(
        this.userRepository,
        data.userId,
        isAdmin,
      );
      const access_token = signAccessToken(
        this.jwtService,
        this.configService,
        user,
      );
      const refresh_token = signRefreshToken(
        this.jwtService,
        this.configService,
        user,
      );

      const vo = new RefreshTokenVo();
      vo.access_token = access_token;
      vo.refresh_token = refresh_token;
      return vo;
    } catch (e) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }

  async updatePassword(passwordDto: UpdateUserPasswordDto) {
    debugger;
    const captcha = await this.redisService.get(
      `update_password_captcha_${passwordDto.email}`,
    );
    validateUpdatePasswordCaptcha(captcha, passwordDto.captcha);

    const foundUser = await this.userRepository.findOneBy({
      username: passwordDto.username,
    });
    if (foundUser.email !== passwordDto.email) {
      throw new HttpException('邮箱不正确', HttpStatus.BAD_REQUEST);
    }
    foundUser.password = md5(passwordDto.password);

    try {
      await this.userRepository.save(foundUser);
      return '密码修改成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '密码修改失败';
    }
  }
  async updatePasswordCaptcha(address: string) {
    try {
      const code = getCode();

      await this.redisService.set(
        `update_password_captcha_${address}`,
        code,
        10 * 60,
      );

      await this.emailService.sendMail({
        to: address,
        subject: '更改密码验证码',
        html: `<p>你的更改密码验证码是 ${code}</p>`,
      });
      return '发送成功';
    } catch (err) {
      console.log(err);
    }
  }

  async update(userId: number, updateUserDto: UpdateUserDto) {
    const captcha = await this.redisService.get(
      `update_user_captcha_${updateUserDto.email}`,
    );
    validateCaptcha(captcha, updateUserDto.captcha);

    const foundUser = await this.userRepository.findOneBy({
      id: userId,
    });
    if (updateUserDto.nickName) {
      foundUser.nickName = updateUserDto.nickName;
    }
    if (updateUserDto.headPic) {
      foundUser.headPic = updateUserDto.headPic;
    }

    try {
      await this.userRepository.save(foundUser);
      return '用户信息修改成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '用户信息修改成功';
    }
  }

  async updateCaptcha(address: string) {
    const code = getCode();

    await this.redisService.set(
      `update_user_captcha_${address}`,
      code,
      10 * 60,
    );

    await this.emailService.sendMail({
      to: address,
      subject: '更改用户信息验证码',
      html: `<p>你的验证码是 ${code}</p>`,
    });
    return '发送成功';
  }

  async freezeUserById(id: number) {
    const foundUser = await this.userRepository.findOneBy({
      id,
    });
    if (!foundUser) {
      throw new NotFoundException('用户不存在');
    }
    foundUser.isFrozen = true;

    await this.userRepository.save(foundUser);
  }

  async findUsers(
    pageNo: number,
    pageSize: number,
    username: string,
    nickName: string,
    email: string,
  ) {
    const skipCount = (pageNo - 1) * pageSize;

    const condition: Record<string, any> = {};

    if (username) {
      condition.username = Like(`%${username}%`);
    }
    if (nickName) {
      condition.nickName = Like(`%${nickName}%`);
    }
    if (email) {
      condition.email = Like(`%${email}%`);
    }

    const [users, totalCount] = await this.userRepository.findAndCount({
      select: [
        'id',
        'username',
        'nickName',
        'email',
        'phoneNumber',
        'isFrozen',
        'headPic',
        'createTime',
      ],
      skip: skipCount,
      take: pageSize,
      where: condition,
    });

    const vo = new UserListVo();
    vo.users = users;
    vo.totalCount = totalCount;
    return vo;
  }

  /**
   * Helper
   */
  async findUserDetailById(userId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });
    return user;
  }

  async initData() {
    const user1 = new User();
    user1.username = 'zhangsan';
    user1.password = md5('111111');
    user1.email = 'xxx@xx.com';
    user1.isAdmin = true;
    user1.nickName = '张三';
    user1.phoneNumber = '13233323333';

    const user2 = new User();
    user2.username = 'lisi';
    user2.password = md5('222222');
    user2.email = 'yy@yy.com';
    user2.nickName = '李四';

    const role1 = new Role();
    role1.name = '管理员';

    const role2 = new Role();
    role2.name = '普通用户';

    const permission1 = new Permission();
    permission1.code = 'ccc';
    permission1.description = '访问 ccc 接口';

    const permission2 = new Permission();
    permission2.code = 'ddd';
    permission2.description = '访问 ddd 接口';

    user1.roles = [role1];
    user2.roles = [role2];

    role1.permissions = [permission1, permission2];
    role2.permissions = [permission1];

    await this.permissionRepository.save([permission1, permission2]);
    await this.roleRepository.save([role1, role2]);
    await this.userRepository.save([user1, user2]);
  }
}
