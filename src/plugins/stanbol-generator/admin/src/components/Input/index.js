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
const TYPE_KEY = "http://fise.iks-project.eu/ontology/entity-type";
const CONFIDENCE_KEY = "http://fise.iks-project.eu/ontology/confidence";
const TEXT_ANNOTATIONS_KEY =
  "http://fise.iks-project.eu/ontology/TextAnnotation";
const SELECTED_TEXT_KEY = "http://fise.iks-project.eu/ontology/selected-text";
const START_KEY = "http://fise.iks-project.eu/ontology/start";
const END_KEY = "http://fise.iks-project.eu/ontology/end";
const ENHANCEMENT_KEY = "http://fise.iks-project.eu/ontology/Enhancement";

const allOfType = (result, type) =>
  result.filter((i) => i["@type"].includes(type));

const getUri = (annotation) => annotation?.["@id"];

const getValue = (annotation) => annotation?.["@value"];

const getType = (annotation) => {
  const types = annotation[TYPE_KEY];
  for (const ann of types) {
    if (ann["@id"] === "http://dbpedia.org/ontology/Place") {
      return "place";
    } else if (ann["@id"] === "http://dbpedia.org/ontology/Person") {
      return "person";
    } else if (ann["@id"] === "http://schema.org/Organization") {
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
  const [enhancements, setEnhancements] = useState({});

  const enhanceText = useCallback(async () => {
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
          const name = annotation["@id"];
          const start = annotation[START_KEY][0]["@value"];
          const end = annotation[END_KEY][0]["@value"];
          const text = annotation[SELECTED_TEXT_KEY][0]["@value"];
          //const type = getType(annotation[TYPE_KEY]);
          const confidence = annotation[CONFIDENCE_KEY];
          setTextAnnotations((prev) => [
            ...prev,
            {
              name,
              start,
              end,
              text,
              confidence,
              selectedText,
              annotation,
            },
          ]);
        }
      });

      const enhancementsResult = allOfType(result, ENHANCEMENT_KEY);

      console.log(enhancementsResult)

      enhancementsResult.forEach((enhancement) => {
        const entityReference = enhancement[ENTITY_REFERENCE_KEY];
        if (entityReference) {
          const entity_text_annotations = enhancement[RELATION_KEY];
          entity_text_annotations.forEach((entity_text_annotation) => {
            const entityObj = {
              entity_ref: getUri(enhancement),
              entity_type: getType(enhancement),
              entity_name: getValue(enhancement[ENTITY_LABEL_KEY]?.[0]),
            };
            const entity_text_annotation_uri = getUri(entity_text_annotation);
            if (entity_text_annotation_uri) {
              setEnhancements((prev) => ({
                ...prev,
                [entity_text_annotation_uri]: prev[entity_text_annotation_uri]
                  ? [...prev[entity_text_annotation_uri], entityObj]
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
    }
  }, [setStanbolResults, onChange, prompt]);

  const clearGeneratedText = async () => {
    onChange({ target: { name, value: "", type: attribute.type } });
  };

  console.log({textAnnotations}, {enhancements})

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
        <Button onClick={() => enhanceText()}>Generate</Button>
        <Button onClick={() => clearGeneratedText()}>Clear</Button>
      </Stack>
      {stanbolResults && (
        <>
          <Typography variant="beta">Recognized Entities</Typography>
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
