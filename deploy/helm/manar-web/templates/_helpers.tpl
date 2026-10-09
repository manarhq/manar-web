{{/*
Expand the name of the chart.
*/}}
{{- define "manar-web.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "manar-web.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "manar-web.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "manar-web.labels" -}}
helm.sh/chart: {{ include "manar-web.chart" . }}
{{ include "manar-web.selectorLabels" . }}
app.kubernetes.io/part-of: manar
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "manar-web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "manar-web.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "manar-web.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "manar-web.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Name of the Secret to use — either the chart-managed one or an externally
managed Secret (see values.yaml's secrets.create / secrets.existingSecretName).
*/}}
{{- define "manar-web.secretName" -}}
{{- if .Values.secrets.create }}
{{- include "manar-web.fullname" . }}
{{- else }}
{{- required "secrets.existingSecretName is required when secrets.create is false" .Values.secrets.existingSecretName }}
{{- end }}
{{- end }}
