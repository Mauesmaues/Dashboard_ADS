const express = require('express');
const CampanhasController = require('../controllers/campanhasController');
const router = express.Router();

// Rotas para dados do N8N
router.get('/n8n/metricas', CampanhasController.obterMetricasN8N);
router.get('/n8n/empresas', CampanhasController.obterEmpresasN8N);
router.get('/n8n/status', CampanhasController.statusDados);

// Rota para mapear contas a empresas
router.post('/mapear-conta', CampanhasController.mapearContaEmpresa);

module.exports = router;
