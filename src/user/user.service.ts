import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { RegisterUserDto } from './dto/register.dto';
import { RedisService } from 'src/redis/redis.service';
import {
  createUser,
  validateCaptcha,
  validateRegisterUser,
} from './em/register.em';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class UserService {
  private logger = new Logger();

  @InjectRepository(User)
  private userRepository: Repository<User>;

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(EmailService)
  private emailService: EmailService;

  async register(user: RegisterUserDto) {
    const captcha = await this.redisService.get(`captcha_${user.email}`);
    validateCaptcha(captcha, user.captcha);

    const foundUser = await this.userRepository.findOneBy({
      username: user.username,
    });
    validateRegisterUser(foundUser);

    const newUser = await createUser(foundUser);

    try {
      await this.userRepository.save(newUser);
      return '注册成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '注册失败';
    }
  }

  async registerCatpcha(address: string) {
    const code = Math.random().toString().slice(2, 8);
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
  }
}
