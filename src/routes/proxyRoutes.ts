import express from 'express';
import { ProxyService } from '../services/proxyService';
import { ProxyController } from '../controllers/proxyController';

export function createProxyRoutes(proxyService: ProxyService) {
  const router = express.Router();
  const proxyController = new ProxyController(proxyService);

  router.get('/proxies', proxyController.getAllProxies);
  router.post('/proxies/set_status', proxyController.setProxyStatus);
  router.get('/proxies/:id/status', proxyController.checkProxyStatus);
  router.get('/proxies/:id/reconnect_current', proxyController.reconnectCurrentProxy);
  router.get('/proxies/:country/add_country', proxyController.reconnectRandomToCountryProxy);
  return router;
}