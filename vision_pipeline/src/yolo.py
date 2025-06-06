from inference import InferencePipeline
from inference.core.interfaces.stream.sinks import render_boxes, render_statistics
from ultralytics import YOLO


class Yolo:
    def __init__(self, model_weights, model_params=None, dataset_path=None, train_model=False, output_weights_path=None,
                 mat_format=None):
        self.model_weights = model_weights
        self.model_params = model_params
        self.dataset_path = dataset_path
        self.train_model = train_model
        self.output_weights_path = output_weights_path
        self.mat_format = mat_format

        self.output_weights_version = None
        self.model = None
        self.results = None

    def load_model(self):
        self.model = YOLO(self.model_weights)

    def model_train(self):
        self.results = self.model.train(self.model_params)

    def generate_confusion_matrix(self):

        pass

    def model_inference(self):
        pass
