import React, { useState } from 'react';
import { usePermission } from '../lib/hooks/usePermission';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { EmptyState } from '../components/feedback/EmptyState';
import { Modal } from '../components/feedback/Modal';
import { ConfirmationDialog } from '../components/feedback/ConfirmationDialog';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Settings,
  ChevronRight,
  Layers,
} from 'lucide-react';

// Types for Pipeline
interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  dealCount?: number;
  totalValue?: number;
}

interface Pipeline {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  stageCount: number;
  dealCount: number;
  totalValue: number;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

// Mock data - replace with actual API calls
const MOCK_PIPELINES: Pipeline[] = [
  {
    id: '1',
    name: 'Sales Pipeline',
    description: 'Default sales process',
    isDefault: true,
    isActive: true,
    stageCount: 5,
    dealCount: 24,
    totalValue: 1250000,
    stages: [
      {
        id: 's1',
        name: 'Prospecting',
        order: 1,
        probability: 10,
        dealCount: 8,
        totalValue: 320000,
      },
      {
        id: 's2',
        name: 'Qualification',
        order: 2,
        probability: 25,
        dealCount: 6,
        totalValue: 380000,
      },
      {
        id: 's3',
        name: 'Needs Analysis',
        order: 3,
        probability: 50,
        dealCount: 4,
        totalValue: 280000,
      },
      { id: 's4', name: 'Proposal', order: 4, probability: 75, dealCount: 3, totalValue: 180000 },
      { id: 's5', name: 'Negotiation', order: 5, probability: 90, dealCount: 3, totalValue: 90000 },
    ],
    createdAt: '2026-01-15T10:30:00Z',
    updatedAt: '2026-02-20T14:20:00Z',
  },
  {
    id: '2',
    name: 'Partner Pipeline',
    description: 'Channel partner sales process',
    isDefault: false,
    isActive: true,
    stageCount: 4,
    dealCount: 12,
    totalValue: 780000,
    stages: [
      { id: 's6', name: 'Lead', order: 1, probability: 10, dealCount: 5, totalValue: 210000 },
      { id: 's7', name: 'Qualified', order: 2, probability: 30, dealCount: 4, totalValue: 260000 },
      { id: 's8', name: 'Proposal', order: 3, probability: 60, dealCount: 2, totalValue: 180000 },
      { id: 's9', name: 'Closing', order: 4, probability: 80, dealCount: 1, totalValue: 130000 },
    ],
    createdAt: '2026-01-20T09:15:00Z',
    updatedAt: '2026-02-18T11:30:00Z',
  },
  {
    id: '3',
    name: 'Legacy Pipeline',
    description: 'Old sales process (archived)',
    isDefault: false,
    isActive: false,
    stageCount: 6,
    dealCount: 0,
    totalValue: 0,
    stages: [
      { id: 's10', name: 'Initial', order: 1, probability: 5 },
      { id: 's11', name: 'Contact', order: 2, probability: 15 },
      { id: 's12', name: 'Meeting', order: 3, probability: 30 },
      { id: 's13', name: 'Review', order: 4, probability: 50 },
      { id: 's14', name: 'Approve', order: 5, probability: 70 },
      { id: 's15', name: 'Close', order: 6, probability: 90 },
    ],
    createdAt: '2025-11-05T13:45:00Z',
    updatedAt: '2026-01-10T16:20:00Z',
  },
];

const ITEMS_PER_PAGE = 10;

const PipelinesPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const { success } = useToast();

  // State
  // Using mock data directly - state setters not needed yet
  const pipelines = MOCK_PIPELINES;
  const loading = false;
  const [currentPage, setCurrentPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStagesModal, setShowStagesModal] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);

  // Filter pipelines
  const filteredPipelines = pipelines.filter((p) => showInactive || p.isActive);
  const totalPages = Math.ceil(filteredPipelines.length / ITEMS_PER_PAGE);
  const paginatedPipelines = filteredPipelines.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreatePipeline = () => {
    // TODO: Implement create pipeline
    setShowCreateModal(false);
    success('Pipeline Created', 'New pipeline has been created successfully');
  };

  const handleEditPipeline = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setShowEditModal(true);
  };

  const handleUpdatePipeline = () => {
    // TODO: Implement update
    setShowEditModal(false);
    setSelectedPipeline(null);
    success('Pipeline Updated', 'Pipeline has been updated successfully');
  };

  const handleDeletePipeline = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    // TODO: Implement delete
    setShowDeleteConfirm(false);
    setSelectedPipeline(null);
    success('Pipeline Deleted', 'Pipeline has been deleted successfully');
  };

  const handleManageStages = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setShowStagesModal(true);
  };

  const handleToggleActive = (pipeline: Pipeline) => {
    // TODO: Implement toggle active status
    success(
      pipeline.isActive ? 'Pipeline Deactivated' : 'Pipeline Activated',
      `${pipeline.name} has been ${pipeline.isActive ? 'deactivated' : 'activated'}`
    );
  };

  const handleDuplicate = (pipeline: Pipeline) => {
    // TODO: Implement duplicate
    success('Pipeline Duplicated', `${pipeline.name} has been duplicated`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
          <p className="text-gray-600">Manage your sales pipelines and stages</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              showInactive
                ? 'bg-gray-200 text-gray-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showInactive ? 'Showing All' : 'Hide Inactive'}
          </button>

          {/* Create Pipeline button - requires pipeline:write */}
          {hasPermission('pipeline:write') && (
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              New Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* Pipelines Grid */}
      {paginatedPipelines.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            title="No pipelines found"
            message={
              showInactive
                ? "You haven't created any pipelines yet"
                : 'No active pipelines found. Try showing inactive pipelines or create a new one.'
            }
            actionLabel={hasPermission('pipeline:write') ? 'Create Pipeline' : undefined}
            onAction={hasPermission('pipeline:write') ? () => setShowCreateModal(true) : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedPipelines.map((pipeline) => (
            <Card
              key={pipeline.id}
              className={`p-6 hover:shadow-lg transition-shadow ${
                !pipeline.isActive ? 'opacity-75 bg-gray-50' : ''
              }`}
            >
              {/* Pipeline Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      pipeline.isDefault
                        ? 'bg-primary-100 text-primary-600'
                        : pipeline.isActive
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {pipeline.name}
                      {pipeline.isDefault && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </h3>
                    {pipeline.description && (
                      <p className="text-sm text-gray-500">{pipeline.description}</p>
                    )}
                  </div>
                </div>

                {/* Status indicator */}
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    pipeline.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {pipeline.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Pipeline Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-900">{pipeline.stageCount}</div>
                  <div className="text-xs text-gray-500">Stages</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-900">{pipeline.dealCount}</div>
                  <div className="text-xs text-gray-500">Deals</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div
                    className="text-lg font-bold text-gray-900 truncate"
                    title={formatCurrency(pipeline.totalValue)}
                  >
                    {pipeline.totalValue > 0 ? formatCurrency(pipeline.totalValue) : '$0'}
                  </div>
                  <div className="text-xs text-gray-500">Value</div>
                </div>
              </div>

              {/* Stages Preview */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">STAGES</span>
                  <button
                    onClick={() => handleManageStages(pipeline)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
                    disabled={!hasPermission('pipeline:manage')}
                  >
                    Manage <ChevronRight className="w-3 h-3 ml-1" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {pipeline.stages.slice(0, 4).map((stage, index) => (
                    <React.Fragment key={stage.id}>
                      <div
                        className="h-2 flex-1 rounded-full"
                        style={{
                          backgroundColor: `hsl(${stage.probability * 1.2}, 70%, 50%)`,
                          opacity: pipeline.isActive ? 1 : 0.5,
                        }}
                        title={`${stage.name}: ${stage.probability}% probability`}
                      />
                      {index < Math.min(pipeline.stages.length, 4) - 1 && (
                        <div className="w-1 h-1 rounded-full bg-gray-300" />
                      )}
                    </React.Fragment>
                  ))}
                  {pipeline.stages.length > 4 && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-xs text-gray-500">+{pipeline.stages.length - 4}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                {/* View/Edit stages - requires pipeline:manage */}
                {hasPermission('pipeline:manage') && (
                  <button
                    onClick={() => handleManageStages(pipeline)}
                    className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Manage Stages"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}

                {/* Duplicate - requires pipeline:write */}
                {hasPermission('pipeline:write') && (
                  <button
                    onClick={() => handleDuplicate(pipeline)}
                    className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Duplicate Pipeline"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}

                {/* Edit - requires pipeline:write */}
                {hasPermission('pipeline:write') && (
                  <button
                    onClick={() => handleEditPipeline(pipeline)}
                    className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Edit Pipeline"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}

                {/* Toggle Active - requires pipeline:manage */}
                {hasPermission('pipeline:manage') && (
                  <button
                    onClick={() => handleToggleActive(pipeline)}
                    className={`p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                      pipeline.isActive
                        ? 'text-gray-400 hover:text-orange-600'
                        : 'text-gray-400 hover:text-green-600'
                    }`}
                    title={pipeline.isActive ? 'Deactivate Pipeline' : 'Activate Pipeline'}
                  >
                    {pipeline.isActive ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}

                {/* Delete - requires pipeline:delete (if different from write) */}
                {hasPermission('pipeline:delete') && (
                  <button
                    onClick={() => handleDeletePipeline(pipeline)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Delete Pipeline"
                    disabled={pipeline.isDefault} // Can't delete default pipeline
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </nav>
        </div>
      )}

      {/* Create Pipeline Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Pipeline"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Create a new pipeline to organize your sales process.</p>
          {/* Form fields would go here */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreatePipeline}>
              Create Pipeline
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Pipeline Modal */}
      {selectedPipeline && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPipeline(null);
          }}
          title="Edit Pipeline"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Edit pipeline: <span className="font-medium">{selectedPipeline.name}</span>
            </p>
            {/* Form fields would go here */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedPipeline(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdatePipeline}>
                Update Pipeline
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Manage Stages Modal */}
      {selectedPipeline && (
        <Modal
          isOpen={showStagesModal}
          onClose={() => {
            setShowStagesModal(false);
            setSelectedPipeline(null);
          }}
          title={`Manage Stages - ${selectedPipeline.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Drag and drop stages to reorder. Click on a stage to edit its details.
              </p>
            </div>

            {/* Stages list */}
            <div className="space-y-2">
              {selectedPipeline.stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-gray-200 rounded-full text-xs font-medium text-gray-700">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{stage.name}</div>
                    <div className="text-sm text-gray-500">
                      Probability: {stage.probability}% • {stage.dealCount || 0} deals
                    </div>
                  </div>
                  {hasPermission('pipeline:manage') && (
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-gray-400 hover:text-primary-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Stage button - requires pipeline:manage */}
            {hasPermission('pipeline:manage') && (
              <Button variant="outline" leftIcon={<Plus className="w-4 h-4" />} className="w-full">
                Add Stage
              </Button>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="primary"
                onClick={() => {
                  setShowStagesModal(false);
                  setSelectedPipeline(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {selectedPipeline && (
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedPipeline(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Pipeline"
          message={`Are you sure you want to delete "${selectedPipeline.name}"? This action cannot be undone.`}
          confirmText="Delete Pipeline"
          cancelText="Cancel"
          isLoading={false}
        />
      )}
    </div>
  );
};

export default PipelinesPage;
