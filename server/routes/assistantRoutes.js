import express from 'express'
import { assistantReply } from '../controllers/assistantController.js'

const router = express.Router()

// POST /api/assistant
router.post('/', assistantReply)

export default router
