# Limitations and safety

1. All starter EHR records and CGM-like readings are synthetic.
2. The 180 mg/dL threshold and 120-minute horizon are demonstration choices, not universal clinical rules.
3. Synthetic-data performance cannot establish real-world or clinical accuracy.
4. Positive events may be rare; accuracy alone can be misleading. Precision, recall, ROC-AUC, average precision, class balance, and baseline performance should be reported.
5. Patient-level splitting reduces leakage between patients, but does not substitute for external validation on an appropriate independent dataset.
6. Model feature importance indicates global model reliance, not causality or individualized clinical explanation.
7. The prototype must not guide diagnosis, treatment, medication dosing, or emergency decisions.
8. Any real deployment requires permitted data, privacy/security controls, independent validation, clinical review, governance, and ongoing monitoring.
