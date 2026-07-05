const express = require('express');
const router = express.Router();
const { 
    getKanbanBoard, 
    getAllStages, 
    getProcessingById, 
    getAvailableStock,
    assignWorker,
    assignMultipleWorkers, 
    updateProgress, 
    completeStage,
    deleteJob,
    getFabricDetails,
    getFabricatorJobs,
    getQueuedFabricatorJobs,
    queueForFabricator,
    bulkAssignFabricator,
    receiveFromFabricator,
    cancelQueuedFabricatorJobs,
    updateAssignment,
    getProductionHistory
} = require('../controllers/processing.controller');

router.get('/board', getKanbanBoard);
router.get('/history', getProductionHistory);
router.get('/fabricator', getFabricatorJobs);
router.get('/queued-fabricator', getQueuedFabricatorJobs); // NEW: Bell Inbox
router.get('/stages', getAllStages);
router.get('/available-stock', getAvailableStock);
router.get('/:id/fabric-details', getFabricDetails);
router.get('/:id', getProcessingById);

router.post('/assign', assignWorker);
router.post('/assign-multiple', assignMultipleWorkers);
router.post('/queue-fabricator', queueForFabricator); // NEW: Cut Stock -> Bell
router.post('/bulk-assign-fabricator', bulkAssignFabricator); // NEW: Bell -> Worker
router.post('/cancel-queued-fabricator', cancelQueuedFabricatorJobs); // NEW: Reversal flow
router.put('/:id/update-progress', updateProgress);
router.put('/:id/complete-stage', completeStage);
router.put('/:id/receive', receiveFromFabricator);
router.put('/:id/assignment', updateAssignment);
router.delete('/:id', deleteJob);

module.exports = router;
