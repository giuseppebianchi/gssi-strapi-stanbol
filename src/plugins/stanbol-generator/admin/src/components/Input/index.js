import React, { useCallback, useState } from "react";
import { useIntl } from "react-intl";
import {
  Stack,
  Button,
  Textarea,
  Box,
  Typography,
  Tag,
  Loader,
} from "@strapi/design-system";
import { auth } from "@strapi/helper-plugin";
import "./style.css";

const ENTITY_REFERENCE_KEY =
  "http://fise.iks-project.eu/ontology/entity-reference";
const ENTITY_LABEL_KEY = "http://fise.iks-project.eu/ontology/entity-label";
const RELATION_KEY = "http://purl.org/dc/terms/relation";
const ANNOTATION_TYPE_KEY = "http://purl.org/dc/terms/type";
const TYPE_KEY = "http://fise.iks-project.eu/ontology/entity-type";
const CONFIDENCE_KEY = "http://fise.iks-project.eu/ontology/confidence";
const TEXT_ANNOTATIONS_KEY =
  "http://fise.iks-project.eu/ontology/TextAnnotation";
const SELECTED_TEXT_KEY = "http://fise.iks-project.eu/ontology/selected-text";
const START_KEY = "http://fise.iks-project.eu/ontology/start";
const END_KEY = "http://fise.iks-project.eu/ontology/end";
const ENHANCEMENT_KEY = "http://fise.iks-project.eu/ontology/Enhancement";
const DEPICTION_KEY = "http://xmlns.com/foaf/0.1/depiction";

const allOfType = (result, type) =>
  result.filter((i) => i["@type"].includes(type));

const allOfResource = (graph, resource, propertyPath) => {
  const items = graph.filter((g) => g["@id"] === resource);
  return propertyPath ? items.map((i) => i[propertyPath]) : items;
};

const getUri = (annotation) => annotation?.["@id"];

const getValue = (annotation) => annotation?.["@value"];

const getType = (annotation, type = TYPE_KEY) => {
  const types = annotation[type];
  for (const ann of types) {
    if (ann["@id"] === "http://dbpedia.org/ontology/Place") {
      return "place";
    } else if (ann["@id"] === "http://dbpedia.org/ontology/Person") {
      return "person";
    } else if (ann["@id"] === "http://dbpedia.org/ontology/Organisation") {
      return "organization";
    }
  }
  return "unkown";
};

export default function Index({
  name,
  error,
  description,
  onChange,
  value,
  intlLabel,
  attribute,
}) {
  const { formatMessage } = useIntl();
  const [prompt, setPrompt] = useState("");
  const [err, setErr] = useState("");
  const [stanbolResults, setStanbolResults] = useState();
  const [textAnnotations, setTextAnnotations] = useState([]);
  const [entityAnnotations, setEntityAnnotations] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const generateTags = useCallback(async () => {
    setTextAnnotations([]);
    setEntityAnnotations([]);
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:1337/stanbol-generator/enhance-text`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            //'Authorization': `Bearer ${auth.getToken()}`
          },
          body: JSON.stringify({ prompt }),
        }
      );

      if (!response?.ok) {
        // show error message
        throw new Error(`Error! status: ${response.status}`);
      }

      const result = await response.json();

      const textAnnotationsResult = allOfType(result, TEXT_ANNOTATIONS_KEY);

      textAnnotationsResult.forEach((annotation) => {
        const selectedText = annotation[SELECTED_TEXT_KEY];
        if (selectedText) {
          const annotation_name = getUri(annotation);
          const start = getValue(annotation[START_KEY][0]);
          const end = getValue(annotation[END_KEY][0]);
          const text = getValue(annotation[SELECTED_TEXT_KEY][0]);
          const annotation_type = getType(annotation, ANNOTATION_TYPE_KEY);
          const confidence = annotation[CONFIDENCE_KEY];
          setTextAnnotations((prev) => [
            ...prev,
            {
              name: annotation_name,
              start,
              end,
              text,
              confidence,
              selectedText,
              annotation,
              type: annotation_type,
            },
          ]);
        }
      });

      const enhancementsResult = allOfType(result, ENHANCEMENT_KEY);

      enhancementsResult.forEach((enhancement) => {
        const entityReference = enhancement[ENTITY_REFERENCE_KEY];
        if (entityReference) {
          const entity_annotations = enhancement[RELATION_KEY];
          entity_annotations.forEach((entity_annotation) => {
            const entityObj = {
              entity_ref: getUri(enhancement),
              entity_type: getType(enhancement),
              entity_name: getValue(enhancement[ENTITY_LABEL_KEY]?.[0]),
              entity_resource: getUri(entityReference[0]),
              entity_enhancement: enhancement,
            };
            const entity_annotation_uri = getUri(entity_annotation);
            if (entity_annotation_uri) {
              setEntityAnnotations((prev) => ({
                ...prev,
                [entity_annotation_uri]: prev[entity_annotation_uri]
                  ? [...prev[entity_annotation_uri], entityObj]
                  : [entityObj],
              }));
            }
          });
        }
      });

      setStanbolResults(result);

      onChange({
        target: { name, value: JSON.stringify(result), type: attribute.type },
      });
    } catch (err) {
      console.log(err);
      if (err?.message) {
        setErr(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [setStanbolResults, onChange, prompt]);

  const clearGeneratedText = async () => {
    onChange({ target: { name, value: "", type: attribute.type } });
  };

  console.log({ textAnnotations }, { entityAnnotations });

  return (
    <Stack spacing={4}>
      <Textarea
        placeholder="Please write a prompt for content to generate"
        label="Prompt"
        name="prompt"
        onChange={(e) => setPrompt(e.target.value)}
        value={prompt}
        className="stanbol-prompt"
      />
      <Stack horizontal spacing={4}>
        <Button onClick={() => generateTags()} loading={isLoading}>
          Generate
        </Button>
        <Button onClick={() => clearGeneratedText()}>Clear</Button>
        {stanbolResults && !!textAnnotations?.length && (
          <Button
            onClick={() => enhanceText()}
            //style={{ background: "#66b7f1", border: "none" }}
            disabled={!textAnnotations.filter((t) => t.selected).length}
          >
            Enhance with selected entities
          </Button>
        )}
      </Stack>
      {stanbolResults && (
        <>
          <Typography variant="beta">Recognized Entities</Typography>
          <Typography variant={""}>
            Select entities to create link, then click on "Enhance with selected
            entities"
          </Typography>
          <Box
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {textAnnotations?.length ? (
              textAnnotations.map((w) => (
                <Tag
                  key={w.name}
                  onClick={(e) => {
                    e.preventDefault();
                    setTextAnnotations((prev) =>
                      prev.map((t) =>
                        t.name === w.name ? { ...t, selected: !t.selected } : t
                      )
                    );
                  }}
                  style={{
                    background: w.selected && "#66b7f1",
                    color: w.selected && "#fff",
                  }}
                >
                  {w.text}
                </Tag>
              ))
            ) : (
              <Button disabled>No Stanbol Tag</Button>
            )}
          </Box>
          <Typography variant="beta">Places</Typography>
          <Box
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {textAnnotations?.length ? (
              textAnnotations.map((w) => (
                <Tag key={w.name} onClick={(e) => console.log(e)}>
                  {w.text}
                </Tag>
              ))
            ) : (
              <Button disabled>No Stanbol Tag</Button>
            )}
          </Box>
          <Textarea
            placeholder="Generated text"
            label="Response"
            name="response"
            onChange={(e) =>
              onChange({
                target: { name, value: e.target.value, type: attribute.type },
              })
            }
            className="stanbol-response"
            disabled
          >
            {value}
          </Textarea>
        </>
      )}
    </Stack>
  );
}
