import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';

interface PlaybookStep {
  order: number;
  action: string;
  auto: boolean;
  eta_secs: number;
}

interface Playbook {
  trigger: string;
  name: string;
  severity_threshold: number;
  steps: PlaybookStep[];
  escalation_after_secs: number;
  escalation_to: string;
}

const PLAYBOOKS: Playbook[] = [
  {
    trigger: 'CROWD_SURGE',
    name: 'Crowd Surge Response',
    severity_threshold: 3,
    steps: [
      { order: 1, action: 'Alert shift supervisor via dashboard notification', auto: true, eta_secs: 0 },
      { order: 2, action: 'Open additional screening lane (Lane 4)', auto: false, eta_secs: 120 },
      { order: 3, action: 'Redirect passenger flow via digital signage', auto: true, eta_secs: 30 },
      { order: 4, action: 'Deploy crowd management team to zone', auto: false, eta_secs: 300 },
      { order: 5, action: 'Monitor density for 10 minutes post-action', auto: true, eta_secs: 600 },
    ],
    escalation_after_secs: 180,
    escalation_to: 'Terminal Operations Director',
  },
  {
    trigger: 'INTRUSION',
    name: 'Perimeter Intrusion Response',
    severity_threshold: 4,
    steps: [
      { order: 1, action: 'Lock down affected zone perimeter gates', auto: true, eta_secs: 0 },
      { order: 2, action: 'Alert security response team', auto: true, eta_secs: 5 },
      { order: 3, action: 'Begin incident recording (point cloud capture)', auto: true, eta_secs: 0 },
      { order: 4, action: 'Dispatch patrol unit to zone', auto: false, eta_secs: 60 },
      { order: 5, action: 'Escalate to airport police if not contained in 5 min', auto: true, eta_secs: 300 },
    ],
    escalation_after_secs: 120,
    escalation_to: 'Airport Police',
  },
  {
    trigger: 'ABANDONED_OBJECT',
    name: 'Unattended Item Response',
    severity_threshold: 2,
    steps: [
      { order: 1, action: 'Mark object location on digital twin', auto: true, eta_secs: 0 },
      { order: 2, action: 'Announce PA message for item owner', auto: false, eta_secs: 30 },
      { order: 3, action: 'If unclaimed after 5 min, alert EOD team', auto: true, eta_secs: 300 },
      { order: 4, action: 'Establish 50m exclusion zone', auto: false, eta_secs: 360 },
    ],
    escalation_after_secs: 300,
    escalation_to: 'EOD Team Leader',
  },
  {
    trigger: 'LOITERING',
    name: 'Loitering Subject Response',
    severity_threshold: 2,
    steps: [
      { order: 1, action: 'Flag subject track on operator dashboard', auto: true, eta_secs: 0 },
      { order: 2, action: 'Continue monitoring for 5 additional minutes', auto: true, eta_secs: 300 },
      { order: 3, action: 'Dispatch plainclothes officer for welfare check', auto: false, eta_secs: 360 },
      { order: 4, action: 'If subject enters restricted zone, escalate to INTRUSION playbook', auto: true, eta_secs: 0 },
    ],
    escalation_after_secs: 600,
    escalation_to: 'Shift Supervisor',
  },
  {
    trigger: 'PERIMETER_BREACH',
    name: 'Perimeter Breach Response',
    severity_threshold: 5,
    steps: [
      { order: 1, action: 'Activate perimeter alarm and lock all airside gates', auto: true, eta_secs: 0 },
      { order: 2, action: 'Alert airport police and security response team', auto: true, eta_secs: 0 },
      { order: 3, action: 'Begin continuous point cloud recording of breach zone', auto: true, eta_secs: 0 },
      { order: 4, action: 'Deploy K-9 unit and armed response to breach point', auto: false, eta_secs: 60 },
      { order: 5, action: 'Halt ground operations in affected sector', auto: false, eta_secs: 120 },
      { order: 6, action: 'Notify TSA / Civil Aviation Authority', auto: true, eta_secs: 180 },
    ],
    escalation_after_secs: 60,
    escalation_to: 'Airport Police Commander',
  },
  {
    trigger: 'DRONE_DETECTED',
    name: 'Drone Incursion Response',
    severity_threshold: 4,
    steps: [
      { order: 1, action: 'Log drone detection coordinates and trajectory', auto: true, eta_secs: 0 },
      { order: 2, action: 'Alert ATC and suspend runway operations if within exclusion zone', auto: true, eta_secs: 5 },
      { order: 3, action: 'Activate counter-UAS system (if available)', auto: false, eta_secs: 30 },
      { order: 4, action: 'Dispatch drone response team to estimated launch point', auto: false, eta_secs: 120 },
      { order: 5, action: 'Notify Civil Aviation Authority and local police', auto: true, eta_secs: 180 },
      { order: 6, action: 'Resume operations once airspace confirmed clear', auto: false, eta_secs: 0 },
    ],
    escalation_after_secs: 120,
    escalation_to: 'Air Traffic Control Supervisor',
  },
];

export default async function playbookRoutes(fastify: FastifyInstance): Promise<void> {
  // ==========================================================================
  // GET /api/v1/playbooks
  // Returns predefined incident response playbooks for each anomaly type.
  // ==========================================================================
  fastify.get('/api/v1/playbooks', {
    preHandler: authMiddleware,
  }, async (_request, reply) => {
    return reply.code(200).send({ playbooks: PLAYBOOKS });
  });
}
