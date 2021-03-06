import HystrixService from '../../services/hystrix-demo.service';
import { Request, Response } from 'express';
import { Observable } from 'rxjs/Observable';
import { ErrorResponseBuilder } from '../../services/response-builder';
import { HttpError } from '../../models/error.model';
import { HttpStatus } from '../../services/http-status-codes';
import container from '../../../common/config/ioc_config';
import SERVICE_IDENTIFIER from '../../../common/constants/identifiers';
import { inject, injectable } from 'inversify';

import ILogger from '../../../common/interfaces/ilogger';
import IMetrics from '../../../common/interfaces/imetrics';
import IHystrixDemo from '../../interfaces/ihystrix-demo';
import { interfaces, controller, httpGet, httpPost, httpDelete, request, queryParam, response, requestParam } from 'inversify-express-utils';

/**
 * Hystrix Demo Controller
 */
@controller('/hystrix-demo')
class HystrixController  implements interfaces.Controller {

  public hystrixDemoService: IHystrixDemo;
  public loggerService: ILogger;
  public metricsService: IMetrics;

  public constructor(
    @inject(SERVICE_IDENTIFIER.HYSTRIX) hystrixDemoService: IHystrixDemo,
    @inject(SERVICE_IDENTIFIER.LOGGER) loggerService: ILogger,
    @inject(SERVICE_IDENTIFIER.METRICS) metricsService: IMetrics
  ) {
    this.hystrixDemoService = hystrixDemoService;
    this.loggerService = loggerService;
    this.metricsService = metricsService;
  }

  /**
   * Simulate a circuit breaker sequence
   * @param req request
   * @param res response
   */
  @httpGet('/start')
  public start(@request() req: Request, @response() res: Response): void {
    this.hystrixDemoService.start()
      .subscribe(
      r => {
        res.status(HttpStatus.OK).json(r);
      }
      );
  }

  /**
   * Get Posts from the jsonplaceholder API
   * Pass the timeout as a query parameter
   * Based on the timeout value the circuit breaker will open or close
   * @param req Request
   * @param res Response
   */
  @httpGet('/posts')
  public posts(@request() req: Request, @response() res: Response): void {
    this.loggerService.info(req.originalUrl);
    this.hystrixDemoService
      .getPosts(req.query.timeOut)
      .subscribe(
      result => {
        // LOG.info(result);
        res.status(HttpStatus.OK).send(result);
        this.loggerService.logAPITrace(req, res, HttpStatus.OK);
        this.metricsService.logAPIMetrics(req, res, HttpStatus.OK);
      },
      err => {
        const error: HttpError = <HttpError>err;
        const resp = new ErrorResponseBuilder()
          .setTitle(error.name)
          .setStatus(HttpStatus.NOT_FOUND)
          .setDetail(error.stack)
          .setMessage(error.message)
          .setSource(req.url)
          .build();
        res.status(HttpStatus.NOT_FOUND).json(resp);
        this.loggerService.logAPITrace(req, res, HttpStatus.NOT_FOUND);
        this.metricsService.logAPIMetrics(req, res, HttpStatus.NOT_FOUND);
      }
      );
  }
}
export default HystrixController;
