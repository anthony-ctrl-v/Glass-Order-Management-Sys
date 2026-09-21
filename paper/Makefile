LATEXMK ?= latexmk
PAPER := paper

.PHONY: paper clean

paper: $(PAPER).tex references.bib
	$(LATEXMK) -pdf -interaction=nonstopmode -halt-on-error -jobname=$(PAPER) $(PAPER).tex

clean:
	$(LATEXMK) -C -jobname=$(PAPER) $(PAPER).tex