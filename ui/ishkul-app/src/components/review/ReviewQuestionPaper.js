import React, { useEffect, useState } from 'react';
import "./ReviewQuestionPaper.css"
import GetIshkulBaseURL from 'ishkul-common/utils';

function ReviewQuestionPaper() {
    const [papers, setPapers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [papersPerPage] = useState(10); // Number of papers per page
    const baseUrl = GetIshkulBaseURL();
    const endpoint = baseUrl + "/contrib/exam_paper"
    useEffect(() => {
        fetch(endpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                setPapers(data.map(paper => ({ ...paper, isExpanded: false })));
            })
            .catch(error => {
                console.log('There was a problem with the fetch operation:', error);
            });
    },);

    const toggleExpand = (e, index) => {
        e.stopPropagation(); // Prevent event bubbling
        setPapers(currentPapers =>
            currentPapers.map((paper, idx) =>
                idx === index ? { ...paper, isExpanded: !paper.isExpanded } : paper
            )
        );
    };

    // Calculate the current papers to display
    const indexOfLastPaper = currentPage * papersPerPage;
    const indexOfFirstPaper = indexOfLastPaper - papersPerPage;
    const currentPapers = papers.slice(indexOfFirstPaper, indexOfLastPaper);

    // Change page
    const paginate = pageNumber => setCurrentPage(pageNumber);

    // Total number of pages
    const pageNumbers = [];
    for (let i = 1; i <= Math.ceil(papers.length / papersPerPage); i++) {
        pageNumbers.push(i);
    }

    const goToPrevPage = () => {
        setCurrentPage(current => Math.max(current - 1, 1));
    };

    // Go to the next page
    const goToNextPage = () => {
        setCurrentPage(current => Math.min(current + 1, pageNumbers.length));
    };



    return (
        <div className="review-question-paper">
            {currentPapers.map((paper, index) => (
                <div key={index} className="paper-item">
                    <div style={{ cursor: 'pointer', marginBottom: '10px' }}>
                        {paper.metadata.institution} - {paper.metadata.year} - {paper.metadata.subject} - {paper.metadata.exam_name}
                        <button onClick={(e) => toggleExpand(e, index)} style={{ marginLeft: '10px' }}>
                            {paper.isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                    </div>
                    <div className={`paper-detail ${paper.isExpanded ? 'expanded' : ''}`}>
                        {paper.isExpanded && (
                            <div>
                                <h3>Resource URL: {paper.resource_url}</h3>
                                <div>Metadata:</div>
                                <ul>
                                    <li>Institution: {paper.metadata.institution}</li>
                                    <li>Year: {paper.metadata.year}</li>
                                    <li>Subject: {paper.metadata.subject}</li>
                                    <li>Exam Name: {paper.metadata.exam_name}</li>
                                    <li>Exam Type: {paper.metadata.exam_type}</li>
                                </ul>
                            </div>
                        )}
                    </div>

                </div>
            ))}

            <nav>
                <ul className='pagination'>
                    <li className='page-item'>
                        <a onClick={goToPrevPage} href='#!' className='page-link'>
                            &laquo; Previous
                        </a>
                    </li>
                    {pageNumbers.map(number => (
                        <li key={number} className={number === currentPage ? 'page-item active' : 'page-item'}>
                            <a onClick={() => paginate(number)} href='#!' className='page-link'>
                                {number}
                            </a>
                        </li>
                    ))}
                    <li className='page-item'>
                        <a onClick={goToNextPage} href='#!' className='page-link'>
                            Next &raquo;
                        </a>
                    </li>
                </ul>
            </nav>

        </div>
    );
}

export default ReviewQuestionPaper;


